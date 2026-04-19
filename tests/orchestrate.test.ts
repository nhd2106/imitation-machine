import { beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { eq } from "drizzle-orm";
import type { PlanFile, PlanTask } from "../agents/types";

const tempRoot = await mkdtemp(join(tmpdir(), "agentic-orchestrate-test-"));
process.env["AGENTIC_DB_PATH"] = join(tempRoot, "state.db");

const { migrate } = await import("../db/migrate");
await migrate();

const { db } = await import("../db/client");
const { plans, agentRuns } = await import("../db/schema");
const { executeOrchestration, __setPlanPersistenceDelayHookForTests } = await import("../cli/commands/orchestrate");
const { planCommand } = await import("../cli/commands/plan");

const SUBPROCESS_TEST_TIMEOUT_MS = 15_000;

type PersonaCommands = Partial<Record<
  "architect" | "po" | "planner" | "coder" | "qa" | "docs" | "security" | "reviewer" | "release",
  string[]
>>;

type TestPlanTask = PlanTask & {
  personaCommands?: PersonaCommands;
};

function makeTask(overrides: Partial<TestPlanTask> = {}): TestPlanTask {
  return {
    id: "TSK-1",
    title: "Create endpoint",
    description: "Create API endpoint and tests",
    filePaths: ["src/api/tasks.ts", "tests/tasks.test.ts"],
    verificationCommand: "bun test tests/tasks.test.ts",
    expectedOutput: "tests pass",
    estimatedMinutes: 5,
    status: "pending",
    executionGroupId: "lane-a",
    prGroupId: "pr-a",
    independence: "independent",
    dependsOnTaskIds: [],
    ...overrides,
  };
}

function insertApprovedPlan(planId: string, requirementId: string, title: string, now: string) {
  db.insert(plans).values({
    id: planId,
    requirementId,
    title,
    tasksJson: "[]",
    status: "approved",
    createdAt: now,
    updatedAt: now,
  }).run();
}

async function writePlanFile(workspace: string, planId: string, title: string, tasks: Array<ReturnType<typeof makeTask>>) {
  const plan: PlanFile<ReturnType<typeof makeTask>> = { id: planId, title, tasks };
  await Bun.write(
    join(workspace, "plans", `${planId}.json`),
    JSON.stringify(plan),
  );
}

function makePersonaCommands(overrides: PersonaCommands = {}): PersonaCommands {
  return {
    architect: ["bun -e \"process.exit(0)\""],
    po: ["bun -e \"process.exit(0)\""],
    planner: ["bun -e \"process.exit(0)\""],
    coder: ["bun -e \"process.exit(0)\""],
    qa: ["bun -e \"process.exit(0)\""],
    docs: ["bun -e \"process.exit(0)\""],
    security: ["bun -e \"process.exit(0)\""],
    reviewer: ["bun -e \"process.exit(0)\""],
    release: ["bun -e \"process.exit(0)\""],
    ...overrides,
  };
}

function makeLoggedDelayCommand(logPath: string, label: string, delayMs: number): string {
  const script = [
    'const fs = require("node:fs");',
    `fs.appendFileSync(${JSON.stringify(logPath)}, ${JSON.stringify(`${label}:start\n`)});`,
    `setTimeout(() => { fs.appendFileSync(${JSON.stringify(logPath)}, ${JSON.stringify(`${label}:end\n`)}); process.exit(0); }, ${delayMs});`,
  ].join(" ");

  return `bun -e ${JSON.stringify(script)}`;
}

beforeEach(() => {
  db.delete(agentRuns).run();
  db.delete(plans).run();
});

describe("orchestrate command", () => {
  test("records one run per persona per task", async () => {
    const planId = "PLN-12345678";
    const now = new Date().toISOString();

    insertApprovedPlan(planId, "REQ-12345678", "Test plan", now);

    const workspace = await mkdtemp(join(tempRoot, "workspace-"));
    await mkdir(join(workspace, "plans"), { recursive: true });
    await writePlanFile(workspace, planId, "Test plan", [makeTask()]);

    const result = await executeOrchestration({
      planId,
      dryRun: true,
      continueOnError: false,
      maxParallel: 3,
      cwd: workspace,
    });

    expect(result.taskCount).toBe(1);
    expect(result.personaOrder).toHaveLength(9);
    expect(result.runCount).toBe(9);
    expect(result.failedRunCount).toBe(0);

    const rows = db.select().from(agentRuns).where(eq(agentRuns.planId, planId)).all();
    expect(rows).toHaveLength(9);
    expect(rows.every((row) => row.status === "completed")).toBe(true);

    const planRow = db.select().from(plans).where(eq(plans.id, planId)).all()[0];
    expect(planRow?.status).toBe("done");
    const savedPlan = await Bun.file(join(workspace, "plans", `${planId}.json`)).json() as {
      tasks: Array<{ status: string }>;
    };
    expect(savedPlan.tasks[0]?.status).toBe("completed");
    expect(planRow?.tasksJson).toContain("completed");
  });

  test("executes real persona commands when not in dry-run", async () => {
    const planId = "PLN-REAL0001";
    const now = new Date().toISOString();

    insertApprovedPlan(planId, "REQ-REAL0001", "Real execution plan", now);

    const workspace = await mkdtemp(join(tempRoot, "workspace-real-"));
    await mkdir(join(workspace, "plans"), { recursive: true });
    await writePlanFile(workspace, planId, "Real execution plan", [
      makeTask({
        id: "TSK-REAL-1",
        title: "Run all personas",
        description: "Each persona executes a harmless shell command",
        filePaths: ["README.md"],
        verificationCommand: "bun -e \"process.exit(0)\"",
        expectedOutput: "all commands pass",
        estimatedMinutes: 2,
        personaCommands: makePersonaCommands(),
      }),
    ]);

    const result = await executeOrchestration({
      planId,
      dryRun: false,
      continueOnError: false,
      maxParallel: 3,
      cwd: workspace,
    });

    expect(result.runCount).toBe(9);
    expect(result.failedRunCount).toBe(0);

    const rows = db.select().from(agentRuns).where(eq(agentRuns.planId, planId)).all();
    expect(rows).toHaveLength(9);
    expect(rows.every((row) => row.status === "completed")).toBe(true);
    expect(rows.every((row) => (row.outputsJson ?? "").includes("process.exit(0)"))).toBe(true);
  }, SUBPROCESS_TEST_TIMEOUT_MS);

  test("runs build personas in parallel within a task", async () => {
    const planId = "PLN-PARALLEL1";
    const now = new Date().toISOString();
    const eventLogPath = join(tempRoot, `build-phase-${planId}.log`);

    insertApprovedPlan(planId, "REQ-PARALLEL1", "Parallel build phase plan", now);

    const workspace = await mkdtemp(join(tempRoot, "workspace-parallel-"));
    await mkdir(join(workspace, "plans"), { recursive: true });
    await writePlanFile(workspace, planId, "Parallel build phase plan", [
      makeTask({
        id: "TSK-PAR-1",
        title: "Parallel-safe stage",
        description: "Run build personas with delay",
        filePaths: ["README.md"],
        verificationCommand: "bun -e \"process.exit(0)\"",
        expectedOutput: "success",
        estimatedMinutes: 2,
        personaCommands: makePersonaCommands({
          coder: [makeLoggedDelayCommand(eventLogPath, "coder", 250)],
          qa: [makeLoggedDelayCommand(eventLogPath, "qa", 250)],
          docs: [makeLoggedDelayCommand(eventLogPath, "docs", 250)],
        }),
      }),
    ]);

    await executeOrchestration({
      planId,
      dryRun: false,
      continueOnError: false,
      maxParallel: 3,
      cwd: workspace,
    });

    const events = (await Bun.file(eventLogPath).text()).trim().split("\n");
    const firstEndIndex = events.findIndex((event) => event.endsWith(":end"));
    expect(firstEndIndex).toBeGreaterThanOrEqual(3);
    expect(events.slice(0, 3).sort()).toEqual(["coder:start", "docs:start", "qa:start"]);
  }, SUBPROCESS_TEST_TIMEOUT_MS);

  test("keeps per-task build personas parallel even when maxParallel limits task groups", async () => {
    const planId = "PLN-BUILD-PAR-1";
    const now = new Date().toISOString();
    const workspace = await mkdtemp(join(tempRoot, "workspace-build-parallel-"));
    const eventLogPath = join(workspace, "build-events.log");

    insertApprovedPlan(planId, "REQ-BUILD-PAR-1", "Build phase invariance", now);
    await mkdir(join(workspace, "plans"), { recursive: true });
    await writePlanFile(workspace, planId, "Build phase invariance", [
      makeTask({
        id: "TSK-BUILD-1",
        title: "Single task build phase",
        filePaths: ["README.md"],
        verificationCommand: "bun -e \"process.exit(0)\"",
        expectedOutput: "success",
        estimatedMinutes: 2,
        personaCommands: makePersonaCommands({
          coder: [makeLoggedDelayCommand(eventLogPath, "coder", 400)],
          qa: [makeLoggedDelayCommand(eventLogPath, "qa", 400)],
          docs: [makeLoggedDelayCommand(eventLogPath, "docs", 400)],
        }),
      }),
    ]);

    await executeOrchestration({
      planId,
      dryRun: false,
      continueOnError: false,
      maxParallel: 1,
      cwd: workspace,
    });

    const events = (await Bun.file(eventLogPath).text()).trim().split("\n");
    const firstEndIndex = events.findIndex((event) => event.endsWith(":end"));
    expect(firstEndIndex).toBeGreaterThanOrEqual(3);
    expect(events.slice(0, 3).sort()).toEqual(["coder:start", "docs:start", "qa:start"]);
  }, SUBPROCESS_TEST_TIMEOUT_MS);

  test("stops governance stage on first failure when continueOnError is false", async () => {
    const planId = "PLN-GOVFAIL1";
    const now = new Date().toISOString();

    insertApprovedPlan(planId, "REQ-GOVFAIL1", "Governance fail plan", now);

    const workspace = await mkdtemp(join(tempRoot, "workspace-govfail-"));
    await mkdir(join(workspace, "plans"), { recursive: true });
    await writePlanFile(workspace, planId, "Governance fail plan", [
      makeTask({
        id: "TSK-GOV-1",
        title: "Fail security",
        description: "Security fails, reviewer/release should not run",
        filePaths: ["README.md"],
        verificationCommand: "bun -e \"process.exit(0)\"",
        expectedOutput: "security fails",
        estimatedMinutes: 2,
        personaCommands: makePersonaCommands({
          security: ["bun -e \"process.exit(5)\""],
        }),
      }),
    ]);

    await expect(executeOrchestration({
      planId,
      dryRun: false,
      continueOnError: false,
      maxParallel: 3,
      cwd: workspace,
    })).rejects.toThrow("Persona security failed");

    const rows = db.select().from(agentRuns).where(eq(agentRuns.planId, planId)).all();
    expect(rows.some((row) => row.persona === "security" && row.status === "failed")).toBe(true);
    expect(rows.some((row) => row.persona === "reviewer")).toBe(false);
    expect(rows.some((row) => row.persona === "release")).toBe(false);
  }, SUBPROCESS_TEST_TIMEOUT_MS);

  test("runs independent execution groups in parallel while preserving in-group order", async () => {
    const planId = "PLN-MULTILANE1";
    const now = new Date().toISOString();

    insertApprovedPlan(planId, "REQ-MULTILANE1", "Multi-lane execution plan", now);

    const workspace = await mkdtemp(join(tempRoot, "workspace-multilane-"));
    await mkdir(join(workspace, "plans"), { recursive: true });

    const eventLogPath = join(workspace, "events.log");

    const buildMultiLaneTasks = (logPath: string) => [
      makeTask({
        id: "TSK-A1",
        title: "Lane A first",
        executionGroupId: "lane-a",
        prGroupId: "pr-a",
        dependsOnTaskIds: [],
        personaCommands: makePersonaCommands({
          architect: [makeLoggedDelayCommand(logPath, "TSK-A1", 250)],
        }),
      }),
      makeTask({
        id: "TSK-A2",
        title: "Lane A second",
        executionGroupId: "lane-a",
        prGroupId: "pr-a",
        dependsOnTaskIds: ["TSK-A1"],
        personaCommands: makePersonaCommands({
          architect: [makeLoggedDelayCommand(logPath, "TSK-A2", 250)],
        }),
      }),
      makeTask({
        id: "TSK-B1",
        title: "Lane B first",
        executionGroupId: "lane-b",
        prGroupId: "pr-b",
        dependsOnTaskIds: [],
        personaCommands: makePersonaCommands({
          architect: [makeLoggedDelayCommand(logPath, "TSK-B1", 250)],
        }),
      }),
    ];

    await writePlanFile(workspace, planId, "Multi-lane execution plan", buildMultiLaneTasks(eventLogPath));
    const result = await executeOrchestration({
      planId,
      dryRun: false,
      continueOnError: false,
      maxParallel: 2,
      cwd: workspace,
    });

    expect(result.taskCount).toBe(3);
    expect(result.failedRunCount).toBe(0);

    const eventLog = await Bun.file(eventLogPath).text();
    const events = eventLog.trim().split("\n");
    expect(events.slice(0, 2).sort()).toEqual(["TSK-A1:start", "TSK-B1:start"]);
    expect(events.indexOf("TSK-A1:end")).toBeLessThan(events.indexOf("TSK-A2:start"));
    expect(events.indexOf("TSK-B1:start")).toBeLessThan(events.indexOf("TSK-A2:start"));

    const rows = db.select().from(agentRuns).where(eq(agentRuns.planId, planId)).all();
    expect(rows).toHaveLength(27);
    expect(rows.every((row) => row.status === "completed")).toBe(true);
  }, SUBPROCESS_TEST_TIMEOUT_MS);

  test("keeps same execution-group tasks ordered even without dependsOnTaskIds", async () => {
    const planId = "PLN-SAMEGROUP-1";
    const now = new Date().toISOString();
    const workspace = await mkdtemp(join(tempRoot, "workspace-same-group-"));
    const eventLogPath = join(workspace, "same-group.log");

    insertApprovedPlan(planId, "REQ-SAMEGROUP-1", "Same-group ordering", now);
    await mkdir(join(workspace, "plans"), { recursive: true });
    await writePlanFile(workspace, planId, "Same-group ordering", [
      makeTask({
        id: "TSK-G1",
        title: "Same group first",
        executionGroupId: "lane-shared",
        prGroupId: "pr-shared",
        dependsOnTaskIds: [],
        personaCommands: makePersonaCommands({
          architect: [makeLoggedDelayCommand(eventLogPath, "TSK-G1", 250)],
        }),
      }),
      makeTask({
        id: "TSK-G2",
        title: "Same group second",
        executionGroupId: "lane-shared",
        prGroupId: "pr-shared",
        dependsOnTaskIds: [],
        personaCommands: makePersonaCommands({
          architect: [makeLoggedDelayCommand(eventLogPath, "TSK-G2", 250)],
        }),
      }),
    ]);

    await executeOrchestration({
      planId,
      dryRun: false,
      continueOnError: false,
      maxParallel: 2,
      cwd: workspace,
    });

    const events = (await Bun.file(eventLogPath).text()).trim().split("\n");
    expect(events).toEqual(["TSK-G1:start", "TSK-G1:end", "TSK-G2:start", "TSK-G2:end"]);
  }, SUBPROCESS_TEST_TIMEOUT_MS);

  test("blocks a task in a different execution group until dependsOnTaskIds completes", async () => {
    const planId = "PLN-CROSSDEP-1";
    const now = new Date().toISOString();
    const workspace = await mkdtemp(join(tempRoot, "workspace-cross-dependency-"));
    const eventLogPath = join(workspace, "cross-dependency.log");

    insertApprovedPlan(planId, "REQ-CROSSDEP-1", "Cross-group dependencies", now);
    await mkdir(join(workspace, "plans"), { recursive: true });
    await writePlanFile(workspace, planId, "Cross-group dependencies", [
      makeTask({
        id: "TSK-A1",
        title: "Producer task",
        executionGroupId: "lane-a",
        prGroupId: "pr-a",
        dependsOnTaskIds: [],
        personaCommands: makePersonaCommands({
          architect: [makeLoggedDelayCommand(eventLogPath, "TSK-A1", 250)],
        }),
      }),
      makeTask({
        id: "TSK-B1",
        title: "Blocked consumer task",
        executionGroupId: "lane-b",
        prGroupId: "pr-b",
        dependsOnTaskIds: ["TSK-A1"],
        personaCommands: makePersonaCommands({
          architect: [makeLoggedDelayCommand(eventLogPath, "TSK-B1", 250)],
        }),
      }),
    ]);

    await executeOrchestration({
      planId,
      dryRun: false,
      continueOnError: false,
      maxParallel: 2,
      cwd: workspace,
    });

    const events = (await Bun.file(eventLogPath).text()).trim().split("\n");
    expect(events).toEqual(["TSK-A1:start", "TSK-A1:end", "TSK-B1:start", "TSK-B1:end"]);
  }, SUBPROCESS_TEST_TIMEOUT_MS);

  test("treats the plan file as source of truth and mirrors tasks to db", async () => {
    const planId = "PLN-FILE-SOURCE-1";
    const now = new Date().toISOString();
    const workspace = await mkdtemp(join(tempRoot, "workspace-file-source-"));

    insertApprovedPlan(planId, "REQ-FILE-SOURCE-1", "File source of truth", now);
    await mkdir(join(workspace, "plans"), { recursive: true });
    await writePlanFile(workspace, planId, "File source of truth", [
      makeTask({ id: "TSK-FILE-1", title: "Task from file" }),
    ]);

    await executeOrchestration({
      planId,
      dryRun: true,
      continueOnError: false,
      maxParallel: 1,
      cwd: workspace,
    });

    const planRow = db.select().from(plans).where(eq(plans.id, planId)).all()[0];
    expect(planRow?.tasksJson).toContain("TSK-FILE-1");
    expect(planRow?.tasksJson).not.toBe("[]");
  });

  test("does not regress persisted task statuses when parallel lanes finish concurrently", async () => {
    const planId = "PLN-CONCURRENT-STATUS-1";
    const now = new Date().toISOString();
    const workspace = await mkdtemp(join(tempRoot, "workspace-concurrent-status-"));

    insertApprovedPlan(planId, "REQ-CONCURRENT-STATUS-1", "Concurrent status persistence", now);
    await mkdir(join(workspace, "plans"), { recursive: true });
    await writePlanFile(workspace, planId, "Concurrent status persistence", [
      makeTask({ id: "TSK-C1", executionGroupId: "lane-a", prGroupId: "pr-a" }),
      makeTask({ id: "TSK-C2", executionGroupId: "lane-b", prGroupId: "pr-b" }),
    ]);

    const planPath = join(workspace, "plans", `${planId}.json`);
    let delayedOnce = false;

    __setPlanPersistenceDelayHookForTests(async (persistedPlanId, persistedTasks) => {
      if (persistedPlanId !== planId || delayedOnce) return;

      const statuses = persistedTasks.map((task) => task.status);
      const completedCount = statuses.filter((status) => status === "completed").length;
      const inProgressCount = statuses.filter((status) => status === "in_progress").length;

      if (completedCount === 1 && inProgressCount === 1) {
        delayedOnce = true;
        await Bun.sleep(100);
      }
    });

    try {
      await executeOrchestration({
        planId,
        dryRun: true,
        continueOnError: false,
        maxParallel: 2,
        cwd: workspace,
      });
    } finally {
      __setPlanPersistenceDelayHookForTests(undefined);
    }

    const persistedPlan = await Bun.file(planPath).json() as {
      tasks: Array<{ id: string; status: string }>;
    };
    expect(persistedPlan.tasks.map((task) => task.status)).toEqual(["completed", "completed"]);

    const planRow = db.select().from(plans).where(eq(plans.id, planId)).all()[0];
    expect(planRow?.tasksJson).toContain('"TSK-C1"');
    expect(planRow?.tasksJson).toContain('"TSK-C2"');
    expect(planRow?.tasksJson).toContain('"status":"completed"');
    expect(planRow?.tasksJson?.match(/"status":"completed"/g)?.length).toBe(2);
  });

  test("rejects scoped execution when same-lane predecessors are still pending", async () => {
    const planId = "PLN-SCOPED-LANE-1";
    const now = new Date().toISOString();
    const workspace = await mkdtemp(join(tempRoot, "workspace-scoped-lane-"));

    insertApprovedPlan(planId, "REQ-SCOPED-LANE-1", "Scoped lane safety", now);
    await mkdir(join(workspace, "plans"), { recursive: true });
    await writePlanFile(workspace, planId, "Scoped lane safety", [
      makeTask({
        id: "TSK-LANE-1",
        title: "Lane predecessor",
        executionGroupId: "lane-a",
        prGroupId: "pr-a",
        status: "pending",
      }),
      makeTask({
        id: "TSK-LANE-2",
        title: "Requested lane task",
        executionGroupId: "lane-a",
        prGroupId: "pr-a",
        status: "pending",
      }),
      makeTask({
        id: "TSK-LANE-3",
        title: "Other lane task",
        executionGroupId: "lane-b",
        prGroupId: "pr-b",
        status: "pending",
      }),
    ]);

    await expect(executeOrchestration({
      planId,
      taskId: "TSK-LANE-2",
      dryRun: true,
      continueOnError: false,
      maxParallel: 2,
      cwd: workspace,
    })).rejects.toThrow("Cannot run task TSK-LANE-2 before same-lane predecessor(s) complete: TSK-LANE-1");

    const persistedPlan = await Bun.file(join(workspace, "plans", `${planId}.json`)).json() as {
      tasks: Array<{ id: string; status: string }>;
    };
    expect(persistedPlan.tasks).toEqual([
      expect.objectContaining({ id: "TSK-LANE-1", status: "pending" }),
      expect.objectContaining({ id: "TSK-LANE-2", status: "pending" }),
      expect.objectContaining({ id: "TSK-LANE-3", status: "pending" }),
    ]);

    const planRow = db.select().from(plans).where(eq(plans.id, planId)).all()[0];
    expect(planRow?.status).toBe("approved");
    expect(planRow?.tasksJson).toContain('"TSK-LANE-1"');
    expect(planRow?.tasksJson).toContain('"TSK-LANE-2"');
    expect(planRow?.tasksJson).toContain('"TSK-LANE-3"');
    expect(planRow?.tasksJson?.match(/"status":"pending"/g)?.length).toBe(3);
  });

  test("scoped task execution preserves sibling tasks and does not finish the whole plan", async () => {
    const planId = "PLN-SCOPED-1";
    const now = new Date().toISOString();
    const workspace = await mkdtemp(join(tempRoot, "workspace-scoped-task-"));

    insertApprovedPlan(planId, "REQ-SCOPED-1", "Scoped orchestration", now);
    await mkdir(join(workspace, "plans"), { recursive: true });
    await writePlanFile(workspace, planId, "Scoped orchestration", [
      makeTask({
        id: "TSK-SCOPE-1",
        title: "Selected task",
        executionGroupId: "lane-a",
        prGroupId: "pr-a",
      }),
      makeTask({
        id: "TSK-SCOPE-2",
        title: "Sibling pending task",
        executionGroupId: "lane-b",
        prGroupId: "pr-b",
      }),
    ]);

    const result = await executeOrchestration({
      planId,
      taskId: "TSK-SCOPE-1",
      dryRun: true,
      continueOnError: false,
      maxParallel: 2,
      cwd: workspace,
    });

    expect(result.taskCount).toBe(1);
    expect(result.runCount).toBe(9);

    const persistedPlan = await Bun.file(join(workspace, "plans", `${planId}.json`)).json() as {
      tasks: Array<{ id: string; status: string }>;
    };
    expect(persistedPlan.tasks).toHaveLength(2);
    expect(persistedPlan.tasks).toEqual([
      expect.objectContaining({ id: "TSK-SCOPE-1", status: "completed" }),
      expect.objectContaining({ id: "TSK-SCOPE-2", status: "pending" }),
    ]);

    const planRow = db.select().from(plans).where(eq(plans.id, planId)).all()[0];
    expect(planRow?.tasksJson).toContain('"TSK-SCOPE-1"');
    expect(planRow?.tasksJson).toContain('"TSK-SCOPE-2"');
    expect(planRow?.tasksJson).toContain('"status":"completed"');
    expect(planRow?.tasksJson).toContain('"status":"pending"');
    expect(planRow?.status).toBe("executing");
  });

  test("plan new seeds db tasksJson from the same template written to disk", async () => {
    const workspace = await mkdtemp(join(tempRoot, "workspace-plan-template-"));
    const previousCwd = process.cwd();

    try {
      await mkdir(join(workspace, "plans"), { recursive: true });
      process.chdir(workspace);

      await planCommand(["new", "--req", "REQ-TEMPLATE-1", "--title", "Template sync plan"]);

      const [planRow] = db.select().from(plans).all();
      const planFilePath = join(workspace, "plans", `${planRow?.id}.json`);
      const planFile = await Bun.file(planFilePath).json() as { tasks: unknown[] };

      expect(planRow?.tasksJson).toBe(JSON.stringify(planFile.tasks));
      expect(planRow?.tasksJson).not.toBe("[]");
    } finally {
      process.chdir(previousCwd);
    }
  });
});
