import { eq } from "drizzle-orm";
import { join } from "node:path";
import { getPersona } from "../../agents/profiles";
import type { PersonaId, PlanFile, PlanTask } from "../../agents/types";
import { startAgentRun } from "../../audit/trail";
import { db } from "../../db/client";
import { agentRuns, plans } from "../../db/schema";

type OrchestrateOptions = {
  planId: string;
  taskId?: string;
  sessionId?: string;
  dryRun: boolean;
  continueOnError: boolean;
  maxParallel: number;
  cwd: string;
};

type PlanTaskWithPersonaCommands = PlanTask & {
  personaCommands?: Partial<Record<PersonaId, string[]>>;
};

type CommandExecution = {
  command: string;
  success: boolean;
  exitCode: number;
  output: string;
};

type PersonaPhase = "plan" | "build" | "governance";

const PLAN_PHASE: readonly PersonaId[] = ["architect", "po", "planner"];
const BUILD_PHASE: readonly PersonaId[] = ["coder", "qa", "docs"];
const GOVERNANCE_PHASE: readonly PersonaId[] = ["security", "reviewer", "release"];
const planPersistenceQueues = new Map<string, Promise<void>>();
let planPersistenceDelayHookForTests: ((planId: string, tasks: PlanTaskWithPersonaCommands[]) => Promise<void> | void) | undefined;

export function __setPlanPersistenceDelayHookForTests(
  hook: ((planId: string, tasks: PlanTaskWithPersonaCommands[]) => Promise<void> | void) | undefined,
): void {
  planPersistenceDelayHookForTests = hook;
}

const ORCHESTRATE_USAGE = `
agentic orchestrate — Run plan tasks through persona workflow

USAGE
  agentic orchestrate run --plan <plan-id> [--task <task-id>] [--session <session-id>] [--dry-run] [--continue-on-error] [--max-parallel <n>] [--cwd <path>]
  agentic orchestrate status --plan <plan-id> [--json]

NOTES
  - Orchestration uses phased execution:
    - plan phase: sequential (architect -> po -> planner)
    - build phase: parallel (coder, qa, docs)
    - governance phase: sequential (security -> reviewer -> release)
  - In normal mode, persona stages execute real commands.
  - In --dry-run mode, stages are simulated and only audit records are written.
`.trim();

export async function orchestrateCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(ORCHESTRATE_USAGE);
    return;
  }

  const subcommand = args[0];
  switch (subcommand) {
    case "run":
      await orchestrateRun(args.slice(1));
      return;
    case "status":
      await orchestrateStatus(args.slice(1));
      return;
    default:
      console.error(`Unknown orchestrate subcommand: ${subcommand}`);
      process.exit(1);
  }
}

export async function executeOrchestration(options: OrchestrateOptions): Promise<{
  planId: string;
  taskCount: number;
  personaOrder: PersonaId[];
  runCount: number;
  failedRunCount: number;
  dryRun: boolean;
}> {
  const planRow = db.select().from(plans).where(eq(plans.id, options.planId)).all()[0];
  if (!planRow) {
    throw new Error(`Plan not found: ${options.planId}`);
  }

  const tasks = await loadPlanTasks(options.cwd, planRow.id, planRow.tasksJson);
  if (tasks.length === 0) {
    throw new Error(`Plan ${planRow.id} has no tasks. Add tasks to plans/${planRow.id}.json or tasks_json.`);
  }

  const selectedTasks = resolveSelectedTasks(tasks, options.taskId, planRow.id);

  const personaOrder = resolvePersonaOrder();

  db.update(plans)
    .set({ status: "executing", updatedAt: new Date().toISOString() })
    .where(eq(plans.id, planRow.id))
    .run();

  let runCount = 0;
  let failedRunCount = 0;
  try {
    const executionResult = await executeTaskGroups(options, planRow.id, tasks, selectedTasks);
    runCount += executionResult.runCount;
    failedRunCount += executionResult.failedRunCount;

    db.update(plans)
      .set({
        status: resolvePlanStatus(tasks),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(plans.id, planRow.id))
      .run();
  } catch (error) {
    db.update(plans)
      .set({ status: "failed", updatedAt: new Date().toISOString() })
      .where(eq(plans.id, planRow.id))
      .run();
    throw error;
  }

  return {
    planId: planRow.id,
    taskCount: selectedTasks.length,
    personaOrder,
    runCount,
    failedRunCount,
    dryRun: options.dryRun,
  };
}

async function executeTaskGroups(
  options: OrchestrateOptions,
  planId: string,
  allTasks: PlanTaskWithPersonaCommands[],
  selectedTasks: PlanTaskWithPersonaCommands[],
): Promise<{ runCount: number; failedRunCount: number }> {
  const completedTaskIds = new Set(allTasks.filter((task) => task.status === "completed").map((task) => task.id));
  const failedTaskIds = new Set(allTasks.filter((task) => task.status === "failed").map((task) => task.id));
  const selectedTaskIds = new Set(selectedTasks.map((task) => task.id));
  const groupQueues = buildExecutionGroupQueues(selectedTasks);
  const activeGroupIds = new Set<string>();
  const activeTaskPromises = new Set<Promise<void>>();
  const result = { runCount: 0, failedRunCount: 0 };
  let stopScheduling = false;
  let firstError: Error | undefined;

  while (hasQueuedTasks(groupQueues) || activeTaskPromises.size > 0) {
    while (!stopScheduling && activeGroupIds.size < options.maxParallel) {
      const nextGroupId = findReadyGroupId(groupQueues, completedTaskIds, selectedTaskIds, failedTaskIds, activeGroupIds);
      if (!nextGroupId) break;

      const queue = groupQueues.get(nextGroupId);
      const task = queue?.shift();
      if (!task) {
        activeGroupIds.delete(nextGroupId);
        continue;
      }

      activeGroupIds.add(nextGroupId);
      const taskPromise = executeTaskWorkflow(task, planId, options, allTasks)
        .then((taskResult) => {
          result.runCount += taskResult.runCount;
          result.failedRunCount += taskResult.failedRunCount;
          if (taskResult.success) {
            completedTaskIds.add(task.id);
          } else {
            failedTaskIds.add(task.id);
            if (!options.continueOnError) {
              stopScheduling = true;
              firstError = firstError ?? new Error(taskResult.error ?? `Task failed: ${task.id}`);
            }
          }
        })
        .catch((error) => {
          failedTaskIds.add(task.id);
          stopScheduling = true;
          firstError = firstError ?? (error instanceof Error ? error : new Error(String(error)));
        })
        .finally(() => {
          activeGroupIds.delete(nextGroupId);
          activeTaskPromises.delete(taskPromise);
        });

      activeTaskPromises.add(taskPromise);
    }

    if (activeTaskPromises.size === 0) {
      if (stopScheduling && firstError) {
        throw firstError;
      }

      if (hasQueuedTasks(groupQueues)) {
        const blockedTaskIds = getBlockedTaskIds(groupQueues);
        throw new Error(`No runnable tasks remain. Check executionGroupId ordering and dependsOnTaskIds for: ${blockedTaskIds.join(", ")}`);
      }

      break;
    }

    await Promise.race(activeTaskPromises);
    if (stopScheduling && activeTaskPromises.size === 0 && firstError) {
      throw firstError;
    }
  }

  return result;
}

async function orchestrateRun(args: string[]): Promise<void> {
  const planId = getFlag(args, "--plan");
  const taskId = getFlag(args, "--task");
  const sessionId = getFlag(args, "--session");
  const cwd = getFlag(args, "--cwd") ?? process.cwd();
  const dryRun = args.includes("--dry-run");
  const continueOnError = args.includes("--continue-on-error");
  const maxParallelFlag = getFlag(args, "--max-parallel");
  const maxParallel = parsePositiveInt(maxParallelFlag, 3);

  if (!planId) {
    console.error("Required: --plan <plan-id>");
    process.exit(1);
  }

  const result = await executeOrchestration({
    planId,
    taskId,
    sessionId,
    dryRun,
    continueOnError,
    maxParallel,
    cwd,
  });

  console.log(`✓ Orchestration completed for ${result.planId}`);
  console.log(`  Tasks executed: ${result.taskCount}`);
  console.log(`  Persona order: ${result.personaOrder.join(" -> ")}`);
  console.log(`  Agent runs recorded: ${result.runCount}`);
  console.log(`  Failed runs: ${result.failedRunCount}`);
  console.log(`  Mode: ${result.dryRun ? "dry-run (simulated)" : "execute (real commands)"}`);
}

async function orchestrateStatus(args: string[]): Promise<void> {
  const planId = getFlag(args, "--plan");
  const asJson = args.includes("--json");
  if (!planId) {
    console.error("Required: --plan <plan-id>");
    process.exit(1);
  }

  const rows = db.select().from(agentRuns).where(eq(agentRuns.planId, planId)).all();
  if (rows.length === 0) {
    console.log(`No agent runs found for plan ${planId}`);
    return;
  }

  const personaCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  const phaseCounts = new Map<string, number>();

  for (const row of rows) {
    personaCounts.set(row.persona, (personaCounts.get(row.persona) ?? 0) + 1);
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
    const phase = extractPhase(row.inputsJson);
    phaseCounts.set(phase, (phaseCounts.get(phase) ?? 0) + 1);
  }

  if (asJson) {
    console.log(JSON.stringify({
      planId,
      totalRuns: rows.length,
      status: Object.fromEntries(statusCounts.entries()),
      phases: Object.fromEntries(phaseCounts.entries()),
      personas: Object.fromEntries(personaCounts.entries()),
    }, null, 2));
    return;
  }

  console.log(`Plan: ${planId}`);
  console.log(`Runs: ${rows.length}`);
  console.log("Status:");
  for (const [status, count] of statusCounts.entries()) {
    console.log(`  - ${status}: ${count}`);
  }
  console.log("Phases:");
  for (const [phase, count] of phaseCounts.entries()) {
    console.log(`  - ${phase}: ${count}`);
  }
  console.log("Personas:");
  for (const [persona, count] of personaCounts.entries()) {
    console.log(`  - ${persona}: ${count}`);
  }
}

function resolvePersonaOrder(): PersonaId[] {
  return [...PLAN_PHASE, ...BUILD_PHASE, ...GOVERNANCE_PHASE];
}

function resolvePlanStatus(tasks: PlanTaskWithPersonaCommands[]): "executing" | "done" | "failed" {
  if (tasks.some((task) => task.status === "failed")) {
    return "failed";
  }

  if (tasks.length > 0 && tasks.every((task) => task.status === "completed")) {
    return "done";
  }

  return "executing";
}

function resolveSelectedTasks(
  tasks: PlanTaskWithPersonaCommands[],
  taskId: string | undefined,
  planId: string,
): PlanTaskWithPersonaCommands[] {
  if (!taskId) {
    return tasks;
  }

  const selectedTaskIndex = tasks.findIndex((task) => task.id === taskId);
  if (selectedTaskIndex === -1) {
    throw new Error(`Task not found in plan ${planId}: ${taskId}`);
  }

  const selectedTask = tasks[selectedTaskIndex];
  if (!selectedTask) {
    throw new Error(`Task not found in plan ${planId}: ${taskId}`);
  }

  const completedTaskIds = new Set(tasks.filter((task) => task.status === "completed").map((task) => task.id));
  const blockedPredecessors = getBlockedSameLanePredecessorIds(tasks, selectedTaskIndex, completedTaskIds);

  if (blockedPredecessors.length > 0) {
    throw new Error(
      `Cannot run task ${selectedTask.id} before same-lane predecessor(s) complete: ${blockedPredecessors.join(", ")}`,
    );
  }

  return [selectedTask];
}

async function loadPlanTasks(cwd: string, planId: string, tasksJson: string): Promise<PlanTaskWithPersonaCommands[]> {
  const planPath = join(cwd, "plans", `${planId}.json`);
  const planFile = Bun.file(planPath);
  if (await planFile.exists()) {
    const plan = await planFile.json() as PlanFile<PlanTaskWithPersonaCommands>;
    const planTasks = Array.isArray(plan.tasks) ? plan.tasks : [];
    await syncPlanTaskSnapshot(planId, planTasks, tasksJson);
    return planTasks;
  }

  try {
    const parsed = JSON.parse(tasksJson) as PlanTaskWithPersonaCommands[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function syncPlanTaskSnapshot(
  planId: string,
  planTasks: PlanTaskWithPersonaCommands[],
  currentTasksJson: string,
): Promise<void> {
  const nextTasksJson = JSON.stringify(planTasks);
  if (nextTasksJson === currentTasksJson) {
    return;
  }

  db.update(plans)
    .set({
      tasksJson: nextTasksJson,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(plans.id, planId))
    .run();
}

function buildExecutionGroupQueues(tasks: PlanTaskWithPersonaCommands[]): Map<string, PlanTaskWithPersonaCommands[]> {
  const queues = new Map<string, PlanTaskWithPersonaCommands[]>();

  for (const task of tasks) {
    const queue = queues.get(task.executionGroupId) ?? [];
    queue.push(task);
    queues.set(task.executionGroupId, queue);
  }

  return queues;
}

function hasQueuedTasks(groupQueues: Map<string, PlanTaskWithPersonaCommands[]>): boolean {
  for (const queue of groupQueues.values()) {
    if (queue.length > 0) return true;
  }
  return false;
}

function findReadyGroupId(
  groupQueues: Map<string, PlanTaskWithPersonaCommands[]>,
  completedTaskIds: Set<string>,
  selectedTaskIds: Set<string>,
  failedTaskIds: Set<string>,
  activeGroupIds: Set<string>,
): string | undefined {
  for (const [groupId, queue] of groupQueues.entries()) {
    if (queue.length === 0 || activeGroupIds.has(groupId)) continue;
    const [nextTask] = queue;
    if (nextTask && isTaskReadyToStart(queue, nextTask, completedTaskIds, selectedTaskIds, failedTaskIds)) {
      return groupId;
    }
  }

  return undefined;
}

function isTaskReadyToStart(
  executionGroupQueue: PlanTaskWithPersonaCommands[],
  task: PlanTaskWithPersonaCommands,
  completedTaskIds: Set<string>,
  selectedTaskIds: Set<string>,
  failedTaskIds: Set<string>,
): boolean {
  const taskIndex = executionGroupQueue.findIndex((queuedTask) => queuedTask.id === task.id);
  if (taskIndex === -1) {
    return false;
  }

  const blockedPredecessors = getBlockedSameLanePredecessorIds(executionGroupQueue, taskIndex, completedTaskIds);
  if (blockedPredecessors.length > 0) {
    return false;
  }

  return areTaskDependenciesSatisfied(task, completedTaskIds, selectedTaskIds, failedTaskIds);
}

function getBlockedSameLanePredecessorIds(
  orderedTasks: PlanTaskWithPersonaCommands[],
  taskIndex: number,
  completedTaskIds: Set<string>,
): string[] {
  const task = orderedTasks[taskIndex];
  if (!task) {
    return [];
  }

  return orderedTasks
    .slice(0, taskIndex)
    .filter((predecessor) => predecessor.executionGroupId === task.executionGroupId && !completedTaskIds.has(predecessor.id))
    .map((predecessor) => predecessor.id);
}

function areTaskDependenciesSatisfied(
  task: PlanTaskWithPersonaCommands,
  completedTaskIds: Set<string>,
  selectedTaskIds: Set<string>,
  failedTaskIds: Set<string>,
): boolean {
  const dependsOnTaskIds = task.dependsOnTaskIds ?? [];
  for (const dependencyTaskId of dependsOnTaskIds) {
    if (completedTaskIds.has(dependencyTaskId)) continue;
    if (failedTaskIds.has(dependencyTaskId)) return false;
    if (selectedTaskIds.has(dependencyTaskId)) return false;
    return false;
  }

  return true;
}

function getBlockedTaskIds(groupQueues: Map<string, PlanTaskWithPersonaCommands[]>): string[] {
  const blockedTaskIds: string[] = [];
  for (const queue of groupQueues.values()) {
    const [task] = queue;
    if (task) blockedTaskIds.push(task.id);
  }
  return blockedTaskIds;
}

async function updateTaskStatus(
  cwd: string,
  planId: string,
  tasks: PlanTaskWithPersonaCommands[],
  taskId: string,
  status: PlanTaskWithPersonaCommands["status"],
): Promise<void> {
  const updatedTasks = tasks.map((task) => task.id === taskId ? { ...task, status } : task);
  tasks.splice(0, tasks.length, ...updatedTasks);

  const persistedTasks = updatedTasks.map((task) => ({ ...task }));

  await enqueuePlanPersistence(planId, async () => {
    await planPersistenceDelayHookForTests?.(planId, persistedTasks);

    const planPath = join(cwd, "plans", `${planId}.json`);
    const planFile = Bun.file(planPath);
    if (await planFile.exists()) {
      const plan = await planFile.json() as PlanFile<PlanTaskWithPersonaCommands>;
      await Bun.write(planPath, JSON.stringify({
        ...plan,
        tasks: persistedTasks,
      }, null, 2));
    }

    db.update(plans)
      .set({
        tasksJson: JSON.stringify(persistedTasks),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(plans.id, planId))
      .run();
  });
}

function enqueuePlanPersistence(planId: string, persist: () => Promise<void>): Promise<void> {
  const previous = planPersistenceQueues.get(planId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(persist);
  planPersistenceQueues.set(planId, next);

  return next.finally(() => {
    if (planPersistenceQueues.get(planId) === next) {
      planPersistenceQueues.delete(planId);
    }
  });
}

async function executePersonaStage(
  personaId: PersonaId,
  task: PlanTaskWithPersonaCommands,
  options: OrchestrateOptions,
): Promise<{ success: boolean; executions: CommandExecution[]; error: string }> {
  if (options.dryRun) {
    return {
      success: true,
      executions: [{
        command: "(dry-run) simulated stage",
        success: true,
        exitCode: 0,
        output: `Simulated ${personaId} stage for task ${task.id}`,
      }],
      error: "",
    };
  }

  const commands = getCommandsForPersona(personaId, task);
  if (commands.length === 0) {
    return {
      success: true,
      executions: [{
        command: "(no-op)",
        success: true,
        exitCode: 0,
        output: `No command defined for persona ${personaId}`,
      }],
      error: "",
    };
  }

  const executions: CommandExecution[] = [];
  for (const command of commands) {
    const execution = await runShellCommand(command, options.cwd);
    executions.push(execution);
    if (!execution.success) {
      return {
        success: false,
        executions,
        error: `Persona ${personaId} failed for task ${task.id}: ${command}`,
      };
    }
  }

  return { success: true, executions, error: "" };
}

async function executeTaskWorkflow(
  task: PlanTaskWithPersonaCommands,
  planId: string,
  options: OrchestrateOptions,
  allTasks: PlanTaskWithPersonaCommands[],
): Promise<{ success: boolean; runCount: number; failedRunCount: number; error?: string }> {
  await updateTaskStatus(options.cwd, planId, allTasks, task.id, "in_progress");

  const planResult = await runSequentialPhase("plan", PLAN_PHASE, task, planId, options);
  let runCount = planResult.runCount;
  let failedRunCount = planResult.failedRunCount;
  if (planResult.failedRunCount > 0) {
    await updateTaskStatus(options.cwd, planId, allTasks, task.id, "failed");
    return {
      success: false,
      runCount,
      failedRunCount,
      error: planResult.firstError ?? `Plan phase failed for task ${task.id}`,
    };
  }

  const buildResult = await runParallelPhase("build", BUILD_PHASE, task, planId, options, BUILD_PHASE.length);
  runCount += buildResult.runCount;
  failedRunCount += buildResult.failedRunCount;
  if (buildResult.failedRunCount > 0) {
    await updateTaskStatus(options.cwd, planId, allTasks, task.id, "failed");
    return {
      success: false,
      runCount,
      failedRunCount,
      error: buildResult.firstError ?? `Build phase failed for task ${task.id}`,
    };
  }

  const governanceResult = await runSequentialPhase("governance", GOVERNANCE_PHASE, task, planId, options);
  runCount += governanceResult.runCount;
  failedRunCount += governanceResult.failedRunCount;
  if (governanceResult.failedRunCount > 0) {
    await updateTaskStatus(options.cwd, planId, allTasks, task.id, "failed");
    return {
      success: false,
      runCount,
      failedRunCount,
      error: governanceResult.firstError ?? `Governance phase failed for task ${task.id}`,
    };
  }

  await updateTaskStatus(options.cwd, planId, allTasks, task.id, "completed");
  return { success: true, runCount, failedRunCount };
}

async function runSequentialPhase(
  phase: PersonaPhase,
  personas: readonly PersonaId[],
  task: PlanTaskWithPersonaCommands,
  planId: string,
  options: OrchestrateOptions,
): Promise<{ runCount: number; failedRunCount: number; firstError?: string }> {
  let runCount = 0;
  let failedRunCount = 0;
  let firstError: string | undefined;

  for (const personaId of personas) {
    const result = await runPersonaStage(phase, personaId, task, planId, options, undefined);
    runCount += 1;
    if (!result.success) {
      failedRunCount += 1;
      firstError = firstError ?? result.error;
      if (!options.continueOnError) break;
    }
  }

  return { runCount, failedRunCount, firstError };
}

async function runParallelPhase(
  phase: PersonaPhase,
  personas: readonly PersonaId[],
  task: PlanTaskWithPersonaCommands,
  planId: string,
  options: OrchestrateOptions,
  maxConcurrency: number,
): Promise<{ runCount: number; failedRunCount: number; firstError?: string }> {
  const queue = [...personas];
  const concurrency = Math.max(1, Math.min(maxConcurrency, queue.length));
  let failedRunCount = 0;
  let firstError: string | undefined;

  const workers = Array.from({ length: concurrency }, async (_, index) => {
    let startedRunCount = 0;

    while (queue.length > 0) {
      const personaId = queue.shift();
      if (!personaId) return startedRunCount;
      startedRunCount += 1;
      const result = await runPersonaStage(phase, personaId, task, planId, options, `build-worker-${index + 1}`);
      if (!result.success) {
        failedRunCount += 1;
        firstError = firstError ?? result.error;
        if (!options.continueOnError) {
          queue.length = 0;
          return startedRunCount;
        }
      }
    }

    return startedRunCount;
  });

  const workerRunCounts = await Promise.all(workers);

  return {
    runCount: workerRunCounts.reduce((total, count) => total + count, 0),
    failedRunCount,
    firstError,
  };
}

async function runPersonaStage(
  phase: PersonaPhase,
  personaId: PersonaId,
  task: PlanTaskWithPersonaCommands,
  planId: string,
  options: OrchestrateOptions,
  parallelGroupId: string | undefined,
): Promise<{ success: boolean; error?: string }> {
  const persona = getPersona(personaId);
  const run = startAgentRun({
    persona: personaId,
    planId,
    taskId: task.id,
    sessionId: options.sessionId,
    inputs: {
      taskTitle: task.title,
      taskDescription: task.description,
      verificationCommand: task.verificationCommand,
      expectedOutput: task.expectedOutput,
      filePaths: task.filePaths,
      dryRun: options.dryRun,
      role: persona.responsibility,
      phase,
      parallelGroupId,
    },
  });

  const result = await executePersonaStage(personaId, task, options);
  if (result.success) {
    run.complete({
      simulated: options.dryRun,
      dryRun: options.dryRun,
      phase,
      parallelGroupId,
      summary: `${persona.name} completed stage for task ${task.id}`,
      executions: result.executions,
      nextGate: personaId === "reviewer" ? "quality" : undefined,
    });
    return { success: true };
  }

  run.fail(result.error);
  return { success: false, error: result.error };
}

function getCommandsForPersona(personaId: PersonaId, task: PlanTaskWithPersonaCommands): string[] {
  const overrides = task.personaCommands?.[personaId];
  if (overrides && overrides.length > 0) {
    return overrides;
  }

  switch (personaId) {
    case "coder":
      return task.verificationCommand ? [task.verificationCommand] : [];
    case "qa":
      return task.verificationCommand ? [task.verificationCommand] : [];
    case "security":
      return [
        `bun cli/index.ts gate security-secrets --ref ${task.id}`,
        `bun cli/index.ts gate security-sast --ref ${task.id}`,
      ];
    case "reviewer":
      return [
        `bun cli/index.ts gate spec --ref ${task.id}`,
        `bun cli/index.ts gate quality --ref ${task.id}`,
      ];
    case "release":
      return [`bun cli/index.ts verify all --ref ${task.id}`];
    default:
      return [];
  }
}

async function runShellCommand(command: string, cwd: string): Promise<CommandExecution> {
  const proc = Bun.spawn(["zsh", "-lc", command], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return {
    command,
    success: exitCode === 0,
    exitCode,
    output: `${stdout}${stderr}`.trim(),
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function extractPhase(inputsJson: string | null): string {
  if (!inputsJson) return "unknown";
  try {
    const parsed = JSON.parse(inputsJson) as { phase?: string };
    return parsed.phase ?? "unknown";
  } catch {
    return "unknown";
  }
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx === -1 ? undefined : args[idx + 1];
}
