import { beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { eq } from "drizzle-orm";

const tempRoot = await mkdtemp(join(tmpdir(), "agentic-db-test-"));
process.env["AGENTIC_DB_PATH"] = join(tempRoot, "state.db");

const { migrate } = await import("../db/migrate");
await migrate();

const { db } = await import("../db/client");
const { agentRuns, approvals, gateResults } = await import("../db/schema");
const { startAgentRun } = await import("../audit/trail");
const { recordApproval, verifyApproval } = await import("../audit/approvals");
const { persistGateResult } = await import("../gates/persist");
const { run: runSpecGate } = await import("../gates/spec");
const { run: runQualityGate } = await import("../gates/quality");

beforeEach(() => {
  db.delete(agentRuns).run();
  db.delete(gateResults).run();
  db.delete(approvals).run();
  process.env["AGENTIC_APPROVAL_SECRET"] = "test-approval-secret";
});

describe("audit trail", () => {
  test("completing one run does not update other runs", () => {
    const runA = startAgentRun({
      persona: "coder",
      planId: "PLN-1",
      taskId: "TSK-1",
      inputs: { step: 1 },
    });

    startAgentRun({
      persona: "qa",
      planId: "PLN-1",
      taskId: "TSK-2",
      inputs: { step: 2 },
    });

    runA.complete({ status: "ok" });

    const rows = db.select().from(agentRuns).all();
    const completed = rows.find((row) => row.id === runA.id);
    const runningCount = rows.filter((row) => row.status === "running").length;

    expect(completed?.status).toBe("completed");
    expect(runningCount).toBe(1);
  });
});

describe("review stage gates", () => {
  test("spec gate passes after explicit spec record", async () => {
    persistGateResult({
      name: "spec",
      ref: "TSK-100",
      passed: true,
      details: [{ severity: "info", message: "spec approved" }],
      durationMs: 0,
    });

    const result = await runSpecGate({ ref: "TSK-100", cwd: process.cwd() });
    expect(result.passed).toBe(true);
  });

  test("quality gate fails when spec stage is missing", async () => {
    const result = await runQualityGate({ ref: "TSK-200", cwd: process.cwd() });
    expect(result.passed).toBe(false);
    expect(result.details.some((detail) => detail.message.includes("Stage 1"))).toBe(true);
  });

  test("quality gate passes after spec and quality records", async () => {
    persistGateResult({
      name: "spec",
      ref: "TSK-201",
      passed: true,
      details: [{ severity: "info", message: "spec approved" }],
      durationMs: 0,
    });

    persistGateResult({
      name: "quality",
      ref: "TSK-201",
      passed: true,
      details: [{ severity: "info", message: "quality approved" }],
      durationMs: 0,
    });

    const result = await runQualityGate({ ref: "TSK-201", cwd: process.cwd() });
    expect(result.passed).toBe(true);
  });
});

describe("approval signing", () => {
  test("requires AGENTIC_APPROVAL_SECRET", async () => {
    delete process.env["AGENTIC_APPROVAL_SECRET"];

    await expect(recordApproval("plan", "PLN-1", "alice")).rejects.toThrow(
      "AGENTIC_APPROVAL_SECRET is required",
    );
  });

  test("signature verification fails when record is tampered", async () => {
    const approvalId = await recordApproval("pr", "123", "alice");

    db.update(approvals)
      .set({ signature: "tampered" })
      .where(eq(approvals.id, approvalId))
      .run();

    const ok = await verifyApproval(approvalId);
    expect(ok).toBe(false);
  });
});
