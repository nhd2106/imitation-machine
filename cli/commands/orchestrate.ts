import { eq } from "drizzle-orm";
import { join } from "node:path";
import { getPersona } from "../../agents/profiles";
import type { PersonaId, PlanTask } from "../../agents/types";
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

  const selectedTasks = options.taskId
    ? tasks.filter((task) => task.id === options.taskId)
    : tasks;

  if (selectedTasks.length === 0) {
    throw new Error(`Task not found in plan ${planRow.id}: ${options.taskId}`);
  }

  const personaOrder = resolvePersonaOrder();

  db.update(plans)
    .set({ status: "executing", updatedAt: new Date().toISOString() })
    .where(eq(plans.id, planRow.id))
    .run();

  let runCount = 0;
  let failedRunCount = 0;
  try {
    for (const task of selectedTasks) {
      await updateTaskStatus(options.cwd, planRow.id, selectedTasks, task.id, "in_progress");

      const planResult = await runSequentialPhase("plan", PLAN_PHASE, task, planRow.id, options);
      runCount += planResult.runCount;
      failedRunCount += planResult.failedRunCount;
      if (planResult.failedRunCount > 0 && !options.continueOnError) {
        await updateTaskStatus(options.cwd, planRow.id, selectedTasks, task.id, "failed");
        throw new Error(planResult.firstError ?? `Plan phase failed for task ${task.id}`);
      }

      const buildResult = await runParallelPhase("build", BUILD_PHASE, task, planRow.id, options);
      runCount += buildResult.runCount;
      failedRunCount += buildResult.failedRunCount;
      if (buildResult.failedRunCount > 0 && !options.continueOnError) {
        await updateTaskStatus(options.cwd, planRow.id, selectedTasks, task.id, "failed");
        throw new Error(buildResult.firstError ?? `Build phase failed for task ${task.id}`);
      }

      const governanceResult = await runSequentialPhase("governance", GOVERNANCE_PHASE, task, planRow.id, options);
      runCount += governanceResult.runCount;
      failedRunCount += governanceResult.failedRunCount;
      if (governanceResult.failedRunCount > 0 && !options.continueOnError) {
        await updateTaskStatus(options.cwd, planRow.id, selectedTasks, task.id, "failed");
        throw new Error(governanceResult.firstError ?? `Governance phase failed for task ${task.id}`);
      }

      await updateTaskStatus(options.cwd, planRow.id, selectedTasks, task.id, "completed");
    }

    db.update(plans)
      .set({
        status: failedRunCount > 0 ? "failed" : "done",
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

async function loadPlanTasks(cwd: string, planId: string, tasksJson: string): Promise<PlanTaskWithPersonaCommands[]> {
  const planPath = join(cwd, "plans", `${planId}.json`);
  const planFile = Bun.file(planPath);
  if (await planFile.exists()) {
    const plan = await planFile.json() as { tasks?: PlanTaskWithPersonaCommands[] };
    return Array.isArray(plan.tasks) ? plan.tasks : [];
  }

  try {
    const parsed = JSON.parse(tasksJson) as PlanTaskWithPersonaCommands[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function updateTaskStatus(
  cwd: string,
  planId: string,
  tasks: PlanTaskWithPersonaCommands[],
  taskId: string,
  status: PlanTaskWithPersonaCommands["status"],
): Promise<void> {
  const updatedTasks = tasks.map((task) => task.id === taskId ? { ...task, status } : task);

  for (let index = 0; index < tasks.length; index += 1) {
    const updatedTask = updatedTasks[index];
    if (updatedTask) {
      tasks[index] = updatedTask;
    }
  }

  const planPath = join(cwd, "plans", `${planId}.json`);
  const planFile = Bun.file(planPath);
  if (await planFile.exists()) {
    const plan = await planFile.json() as Record<string, unknown>;
    await Bun.write(planPath, JSON.stringify({
      ...plan,
      tasks: updatedTasks,
    }, null, 2));
  }

  db.update(plans)
    .set({
      tasksJson: JSON.stringify(updatedTasks),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(plans.id, planId))
    .run();
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
): Promise<{ runCount: number; failedRunCount: number; firstError?: string }> {
  const queue = [...personas];
  const concurrency = Math.max(1, Math.min(options.maxParallel, queue.length));
  let failedRunCount = 0;
  let firstError: string | undefined;

  const workers = Array.from({ length: concurrency }, async (_, index) => {
    while (queue.length > 0) {
      const personaId = queue.shift();
      if (!personaId) return;
      const result = await runPersonaStage(phase, personaId, task, planId, options, `build-worker-${index + 1}`);
      if (!result.success) {
        failedRunCount += 1;
        firstError = firstError ?? result.error;
        if (!options.continueOnError) {
          queue.length = 0;
          return;
        }
      }
    }
  });

  await Promise.all(workers);

  return {
    runCount: personas.length,
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
