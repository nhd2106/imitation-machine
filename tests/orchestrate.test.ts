import { beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { eq } from "drizzle-orm";

const tempRoot = await mkdtemp(join(tmpdir(), "agentic-orchestrate-test-"));
process.env["AGENTIC_DB_PATH"] = join(tempRoot, "state.db");

const { migrate } = await import("../db/migrate");
await migrate();

const { db } = await import("../db/client");
const { plans, agentRuns } = await import("../db/schema");
const { executeOrchestration } = await import("../cli/commands/orchestrate");

beforeEach(() => {
  db.delete(agentRuns).run();
  db.delete(plans).run();
});

describe("orchestrate command", () => {
  test("records one run per persona per task", async () => {
    const planId = "PLN-12345678";
    const now = new Date().toISOString();

    db.insert(plans).values({
      id: planId,
      requirementId: "REQ-12345678",
      title: "Test plan",
      tasksJson: "[]",
      status: "approved",
      createdAt: now,
      updatedAt: now,
    }).run();

    const workspace = await mkdtemp(join(tempRoot, "workspace-"));
    await mkdir(join(workspace, "plans"), { recursive: true });
    await Bun.write(
      join(workspace, "plans", `${planId}.json`),
      JSON.stringify({
        id: planId,
        title: "Test plan",
        tasks: [
          {
            id: "TSK-1",
            title: "Create endpoint",
            description: "Create API endpoint and tests",
            filePaths: ["src/api/tasks.ts", "tests/tasks.test.ts"],
            verificationCommand: "bun test tests/tasks.test.ts",
            expectedOutput: "tests pass",
            estimatedMinutes: 5,
            status: "pending",
          },
        ],
      }),
    );

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

    db.insert(plans).values({
      id: planId,
      requirementId: "REQ-REAL0001",
      title: "Real execution plan",
      tasksJson: "[]",
      status: "approved",
      createdAt: now,
      updatedAt: now,
    }).run();

    const workspace = await mkdtemp(join(tempRoot, "workspace-real-"));
    await mkdir(join(workspace, "plans"), { recursive: true });
    await Bun.write(
      join(workspace, "plans", `${planId}.json`),
      JSON.stringify({
        id: planId,
        title: "Real execution plan",
        tasks: [
          {
            id: "TSK-REAL-1",
            title: "Run all personas",
            description: "Each persona executes a harmless shell command",
            filePaths: ["README.md"],
            verificationCommand: "bun -e \"process.exit(0)\"",
            expectedOutput: "all commands pass",
            estimatedMinutes: 2,
            status: "pending",
            personaCommands: {
              architect: ["bun -e \"process.exit(0)\""],
              po: ["bun -e \"process.exit(0)\""],
              planner: ["bun -e \"process.exit(0)\""],
              coder: ["bun -e \"process.exit(0)\""],
              qa: ["bun -e \"process.exit(0)\""],
              security: ["bun -e \"process.exit(0)\""],
              reviewer: ["bun -e \"process.exit(0)\""],
              docs: ["bun -e \"process.exit(0)\""],
              release: ["bun -e \"process.exit(0)\""],
            },
          },
        ],
      }),
    );

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
  });

  test("runs build personas in parallel when maxParallel allows", async () => {
    const planId = "PLN-PARALLEL1";
    const now = new Date().toISOString();

    db.insert(plans).values({
      id: planId,
      requirementId: "REQ-PARALLEL1",
      title: "Parallel build phase plan",
      tasksJson: "[]",
      status: "approved",
      createdAt: now,
      updatedAt: now,
    }).run();

    const workspace = await mkdtemp(join(tempRoot, "workspace-parallel-"));
    await mkdir(join(workspace, "plans"), { recursive: true });
    await Bun.write(
      join(workspace, "plans", `${planId}.json`),
      JSON.stringify({
        id: planId,
        title: "Parallel build phase plan",
        tasks: [
          {
            id: "TSK-PAR-1",
            title: "Parallel-safe stage",
            description: "Run build personas with delay",
            filePaths: ["README.md"],
            verificationCommand: "bun -e \"process.exit(0)\"",
            expectedOutput: "success",
            estimatedMinutes: 2,
            status: "pending",
            personaCommands: {
              architect: ["bun -e \"process.exit(0)\""],
              po: ["bun -e \"process.exit(0)\""],
              planner: ["bun -e \"process.exit(0)\""],
              coder: ["bun -e \"setTimeout(() => process.exit(0), 250)\""],
              qa: ["bun -e \"setTimeout(() => process.exit(0), 250)\""],
              docs: ["bun -e \"setTimeout(() => process.exit(0), 250)\""],
              security: ["bun -e \"process.exit(0)\""],
              reviewer: ["bun -e \"process.exit(0)\""],
              release: ["bun -e \"process.exit(0)\""],
            },
          },
        ],
      }),
    );

    const startedAtParallel = Date.now();
    await executeOrchestration({
      planId,
      dryRun: false,
      continueOnError: false,
      maxParallel: 3,
      cwd: workspace,
    });
    const elapsedParallelMs = Date.now() - startedAtParallel;

    const planIdSequential = "PLN-PARALLEL2";
    db.insert(plans).values({
      id: planIdSequential,
      requirementId: "REQ-PARALLEL2",
      title: "Sequential baseline",
      tasksJson: "[]",
      status: "approved",
      createdAt: now,
      updatedAt: now,
    }).run();

    await Bun.write(
      join(workspace, "plans", `${planIdSequential}.json`),
      JSON.stringify({
        id: planIdSequential,
        title: "Sequential baseline",
        tasks: [
          {
            id: "TSK-PAR-2",
            title: "Sequential-safe stage",
            description: "Same commands but maxParallel=1",
            filePaths: ["README.md"],
            verificationCommand: "bun -e \"process.exit(0)\"",
            expectedOutput: "success",
            estimatedMinutes: 2,
            status: "pending",
            personaCommands: {
              architect: ["bun -e \"process.exit(0)\""],
              po: ["bun -e \"process.exit(0)\""],
              planner: ["bun -e \"process.exit(0)\""],
              coder: ["bun -e \"setTimeout(() => process.exit(0), 250)\""],
              qa: ["bun -e \"setTimeout(() => process.exit(0), 250)\""],
              docs: ["bun -e \"setTimeout(() => process.exit(0), 250)\""],
              security: ["bun -e \"process.exit(0)\""],
              reviewer: ["bun -e \"process.exit(0)\""],
              release: ["bun -e \"process.exit(0)\""],
            },
          },
        ],
      }),
    );

    const startedAtSequential = Date.now();
    await executeOrchestration({
      planId: planIdSequential,
      dryRun: false,
      continueOnError: false,
      maxParallel: 1,
      cwd: workspace,
    });
    const elapsedSequentialMs = Date.now() - startedAtSequential;

    expect(elapsedParallelMs).toBeLessThan(elapsedSequentialMs);
  });

  test("stops governance stage on first failure when continueOnError is false", async () => {
    const planId = "PLN-GOVFAIL1";
    const now = new Date().toISOString();

    db.insert(plans).values({
      id: planId,
      requirementId: "REQ-GOVFAIL1",
      title: "Governance fail plan",
      tasksJson: "[]",
      status: "approved",
      createdAt: now,
      updatedAt: now,
    }).run();

    const workspace = await mkdtemp(join(tempRoot, "workspace-govfail-"));
    await mkdir(join(workspace, "plans"), { recursive: true });
    await Bun.write(
      join(workspace, "plans", `${planId}.json`),
      JSON.stringify({
        id: planId,
        title: "Governance fail plan",
        tasks: [
          {
            id: "TSK-GOV-1",
            title: "Fail security",
            description: "Security fails, reviewer/release should not run",
            filePaths: ["README.md"],
            verificationCommand: "bun -e \"process.exit(0)\"",
            expectedOutput: "security fails",
            estimatedMinutes: 2,
            status: "pending",
            personaCommands: {
              architect: ["bun -e \"process.exit(0)\""],
              po: ["bun -e \"process.exit(0)\""],
              planner: ["bun -e \"process.exit(0)\""],
              coder: ["bun -e \"process.exit(0)\""],
              qa: ["bun -e \"process.exit(0)\""],
              docs: ["bun -e \"process.exit(0)\""],
              security: ["bun -e \"process.exit(5)\""],
              reviewer: ["bun -e \"process.exit(0)\""],
              release: ["bun -e \"process.exit(0)\""],
            },
          },
        ],
      }),
    );

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
  });
});
