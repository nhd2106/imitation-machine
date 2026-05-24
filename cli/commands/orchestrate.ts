import { and, eq, isNull } from "drizzle-orm";
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

type PersonaPhase = "plan" | "implementation" | "specialized" | "final-review" | "release";

const PLAN_PHASE: readonly PersonaId[] = ["architect", "po", "planner"];
const IMPLEMENTATION_REVIEW_PHASE: readonly PersonaId[] = ["coder", "reviewer-spec", "reviewer-quality"];
const SPECIALIZED_PHASE: readonly PersonaId[] = ["security", "qa", "docs"];
const FINAL_REVIEW_PHASE: readonly PersonaId[] = ["reviewer-final"];
const RELEASE_PHASE: readonly PersonaId[] = ["release"];
const planPersistenceQueues = new Map<string, Promise<void>>();
let planPersistenceDelayHookForTests: ((planId: string, tasks: PlanTaskWithPersonaCommands[]) => Promise<void> | void) | undefined;

function queryCompletedPersonas(planId: string, taskId: string | undefined): Set<PersonaId> {
  const rows = db.select({ persona: agentRuns.persona }).from(agentRuns)
    .where(
      taskId !== undefined
        ? and(eq(agentRuns.planId, planId), eq(agentRuns.taskId, taskId), eq(agentRuns.status, "completed"))
        : and(eq(agentRuns.planId, planId), isNull(agentRuns.taskId), eq(agentRuns.status, "completed")),
    )
    .all();
  return new Set(rows.map((row) => row.persona as PersonaId));
}

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
    - implementation/task-level review phase: sequential (coder -> reviewer-spec -> reviewer-quality)
    - specialized evidence phase: parallel (security, qa, docs)
    - verification phase: fresh task verification command
    - delivery finalization: after all plan tasks complete, fresh plan verification, reviewer-final, then release/handoff
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

    if (isDeliveryFinalizationDue(tasks)) {
      const finalizationResult = await executeDeliveryFinalization(planRow.id, tasks, options);
      runCount += finalizationResult.runCount;
      failedRunCount += finalizationResult.failedRunCount;
      if (finalizationResult.failedRunCount > 0) {
        throw new Error(finalizationResult.firstError ?? `Delivery finalization failed for plan ${planRow.id}`);
      }
    }

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
  return [
    ...PLAN_PHASE,
    ...IMPLEMENTATION_REVIEW_PHASE,
    ...SPECIALIZED_PHASE,
    ...FINAL_REVIEW_PHASE,
    ...RELEASE_PHASE,
  ];
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

function isDeliveryFinalizationDue(tasks: PlanTaskWithPersonaCommands[]): boolean {
  return tasks.length > 0 && tasks.every((task) => task.status === "completed");
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
  subjectLabel: string = `task ${task.id}`,
): Promise<{ success: boolean; executions: CommandExecution[]; error: string }> {
  if (options.dryRun) {
    return {
      success: true,
      executions: [{
        command: "(dry-run) simulated stage",
        success: true,
        exitCode: 0,
        output: `Simulated ${personaId} stage for ${subjectLabel}`,
      }],
      error: "",
    };
  }

  const commands = getCommandsForPersona(personaId, task);
  if (commands.length === 0) {
    if (personaId === "reviewer-final") {
      return {
        success: false,
        executions: [],
        error: `reviewer-final command is required before release for ${subjectLabel}. Configure personaCommands["reviewer-final"] with an explicit final review command or subagent dispatch.`,
      };
    }

    return {
      success: true,
      executions: [buildSkippedExecution(personaId)],
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
        error: `Persona ${personaId} failed for ${subjectLabel}: ${command}`,
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

  const completedPersonas = queryCompletedPersonas(planId, task.id);

  const planResult = await runSequentialPhase("plan", PLAN_PHASE, task, planId, options, "task", completedPersonas);
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

  const implementationResult = await runSequentialPhase("implementation", IMPLEMENTATION_REVIEW_PHASE, task, planId, options, "task", completedPersonas);
  runCount += implementationResult.runCount;
  failedRunCount += implementationResult.failedRunCount;
  if (implementationResult.failedRunCount > 0) {
    await updateTaskStatus(options.cwd, planId, allTasks, task.id, "failed");
    return {
      success: false,
      runCount,
      failedRunCount,
      error: implementationResult.firstError ?? `Implementation review phase failed for task ${task.id}`,
    };
  }

  const specializedResult = await runParallelPhase("specialized", SPECIALIZED_PHASE, task, planId, options, SPECIALIZED_PHASE.length, completedPersonas);
  runCount += specializedResult.runCount;
  failedRunCount += specializedResult.failedRunCount;
  if (specializedResult.failedRunCount > 0) {
    await updateTaskStatus(options.cwd, planId, allTasks, task.id, "failed");
    return {
      success: false,
      runCount,
      failedRunCount,
      error: specializedResult.firstError ?? `Specialized evidence phase failed for task ${task.id}`,
    };
  }

  const verificationResult = await executeVerificationStage(task, options);
  if (!verificationResult.success) {
    await updateTaskStatus(options.cwd, planId, allTasks, task.id, "failed");
    return {
      success: false,
      runCount,
      failedRunCount,
      error: verificationResult.error ?? `Verification phase failed for task ${task.id}`,
    };
  }

  await updateTaskStatus(options.cwd, planId, allTasks, task.id, "completed");
  return { success: true, runCount, failedRunCount };
}

async function executeDeliveryFinalization(
  planId: string,
  tasks: PlanTaskWithPersonaCommands[],
  options: OrchestrateOptions,
): Promise<{ runCount: number; failedRunCount: number; firstError?: string }> {
  const verificationResult = await executePlanVerificationStage(planId, options);
  if (!verificationResult.success) {
    return {
      runCount: 0,
      failedRunCount: 1,
      firstError: verificationResult.error ?? `Plan verification failed for plan ${planId}`,
    };
  }

  const completedPersonas = queryCompletedPersonas(planId, undefined);

  const deliveryTask = buildDeliveryFinalizationTask(planId, tasks);
  const finalReviewResult = await runSequentialPhase("final-review", FINAL_REVIEW_PHASE, deliveryTask, planId, options, "plan", completedPersonas);
  let runCount = finalReviewResult.runCount;
  let failedRunCount = finalReviewResult.failedRunCount;
  if (finalReviewResult.failedRunCount > 0) {
    return {
      runCount,
      failedRunCount,
      firstError: finalReviewResult.firstError ?? `Final review phase failed for plan ${planId}`,
    };
  }

  const releaseResult = await runSequentialPhase("release", RELEASE_PHASE, deliveryTask, planId, options, "plan", completedPersonas);
  runCount += releaseResult.runCount;
  failedRunCount += releaseResult.failedRunCount;
  if (releaseResult.failedRunCount > 0) {
    return {
      runCount,
      failedRunCount,
      firstError: releaseResult.firstError ?? `Release phase failed for plan ${planId}`,
    };
  }

  return { runCount, failedRunCount };
}

async function executePlanVerificationStage(
  planId: string,
  options: OrchestrateOptions,
): Promise<{ success: boolean; error?: string }> {
  if (options.dryRun) {
    return { success: true };
  }

  const command = buildPlanVerificationCommand(planId);
  const execution = await runShellCommand(command, options.cwd);
  if (!execution.success) {
    return {
      success: false,
      error: `Plan verification failed for plan ${planId}: ${command}`,
    };
  }

  return { success: true };
}

function buildDeliveryFinalizationTask(
  planId: string,
  tasks: PlanTaskWithPersonaCommands[],
): PlanTaskWithPersonaCommands {
  const deliveryPersonaCommands: Partial<Record<PersonaId, string[]>> = {};
  for (const personaId of [...FINAL_REVIEW_PHASE, ...RELEASE_PHASE]) {
    const configuredCommands = tasks
      .map((task) => task.personaCommands?.[personaId])
      .find((commands): commands is string[] => Array.isArray(commands) && commands.length > 0);
    if (configuredCommands) {
      deliveryPersonaCommands[personaId] = configuredCommands;
    }
  }

  return {
    id: planId,
    title: `Delivery finalization for ${planId}`,
    description: `Final integrated review and release handoff for plan ${planId}`,
    filePaths: Array.from(new Set(tasks.flatMap((task) => task.filePaths))),
    verificationCommand: buildPlanVerificationCommand(planId),
    expectedOutput: "Plan-level verification passes",
    estimatedMinutes: 0,
    executionGroupId: "delivery-finalization",
    prGroupId: "delivery-finalization",
    independence: "shared",
    dependsOnTaskIds: tasks.map((task) => task.id),
    status: "completed",
    personaCommands: deliveryPersonaCommands,
  };
}

async function executeVerificationStage(
  task: PlanTaskWithPersonaCommands,
  options: OrchestrateOptions,
): Promise<{ success: boolean; error?: string }> {
  const verificationCommand = task.verificationCommand?.trim() ?? "";
  if (options.dryRun) {
    return { success: true };
  }

  const commands = [
    ...(verificationCommand.length > 0 ? [verificationCommand] : []),
    buildFullVerificationCommand(task),
  ];

  for (const command of commands) {
    const execution = await runShellCommand(command, options.cwd);
    if (!execution.success) {
      return {
        success: false,
        error: `Verification failed for task ${task.id}: ${command}`,
      };
    }
  }

  return { success: true };
}

function buildFullVerificationCommand(task: PlanTaskWithPersonaCommands): string {
  return `bun cli/index.ts verify all --ref ${task.id}`;
}

function buildPlanVerificationCommand(planId: string): string {
  return `bun cli/index.ts verify all --ref ${planId}`;
}

async function runSequentialPhase(
  phase: PersonaPhase,
  personas: readonly PersonaId[],
  task: PlanTaskWithPersonaCommands,
  planId: string,
  options: OrchestrateOptions,
  scope: "task" | "plan" = "task",
  completedPersonas: Set<PersonaId> = new Set(),
): Promise<{ runCount: number; failedRunCount: number; firstError?: string }> {
  let runCount = 0;
  let failedRunCount = 0;
  let firstError: string | undefined;

  for (const personaId of personas) {
    if (completedPersonas.has(personaId)) {
      continue;
    }
    const result = await runPersonaStage(phase, personaId, task, planId, options, undefined, scope);
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
  completedPersonas: Set<PersonaId> = new Set(),
): Promise<{ runCount: number; failedRunCount: number; firstError?: string }> {
  const queue = personas.filter((p) => !completedPersonas.has(p));
  const concurrency = Math.max(1, Math.min(maxConcurrency, queue.length));
  let failedRunCount = 0;
  let firstError: string | undefined;

  const workers = Array.from({ length: concurrency }, async (_, index) => {
    let startedRunCount = 0;

    while (queue.length > 0) {
      const personaId = queue.shift();
      if (!personaId) return startedRunCount;
      startedRunCount += 1;
      const result = await runPersonaStage(phase, personaId, task, planId, options, `${phase}-worker-${index + 1}`);
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
  scope: "task" | "plan" = "task",
): Promise<{ success: boolean; error?: string }> {
  const persona = getPersona(personaId);
  const subjectLabel = scope === "plan" ? `plan ${planId}` : `task ${task.id}`;
  const run = startAgentRun({
    persona: personaId,
    planId,
    taskId: scope === "plan" ? undefined : task.id,
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
      scope,
      parallelGroupId,
    },
  });

  const result = await executePersonaStage(personaId, task, options, subjectLabel);
  if (result.success) {
    const skipped = result.executions.every((execution) => execution.command === "(skipped)");
    run.complete({
      simulated: options.dryRun,
      dryRun: options.dryRun,
      phase,
      parallelGroupId,
      summary: skipped
        ? `${persona.name} skipped stage for ${subjectLabel}`
        : `${persona.name} completed stage for ${subjectLabel}`,
      executions: result.executions,
      nextGate: personaId === "reviewer-spec" ? "quality" : undefined,
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
      return [];
    case "security":
      return [
        `bun cli/index.ts gate security-secrets --ref ${task.id}`,
        `bun cli/index.ts gate security-sast --ref ${task.id}`,
      ];
    case "reviewer-spec":
      return [
        `bun cli/index.ts gate spec --ref ${task.id}`,
      ];
    case "reviewer-quality":
      return [
        `bun cli/index.ts gate quality --ref ${task.id}`,
      ];
    case "reviewer-final":
    case "reviewer":
      return [];
    case "release":
      return [];
    default:
      return [];
  }
}

function buildSkippedExecution(personaId: PersonaId): CommandExecution {
  const output = personaId === "qa"
    ? "Skipped QA stage: no configured QA command. Configure personaCommands.qa to run a real QA dispatch command."
    : personaId === "release"
      ? "Skipped release stage: no configured release command. Configure personaCommands.release to run an explicit release-readiness handoff command."
      : `Skipped ${personaId} stage: no configured command.`;

  return {
    command: "(skipped)",
    success: true,
    exitCode: 0,
    output,
  };
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
