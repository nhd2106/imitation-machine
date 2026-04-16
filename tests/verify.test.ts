import { describe, expect, test } from "bun:test";
import { buildDefaultChecks, runVerificationChecklist, type VerificationCheck } from "../cli/commands/verify";

describe("verify command", () => {
  test("buildDefaultChecks returns expected check IDs", () => {
    const checks = buildDefaultChecks("/tmp/workspace", "abc123");
    expect(checks.map((check) => check.id)).toEqual(["merge-gates", "typecheck", "tests"]);
  });

  test("runVerificationChecklist reports pass and fail checks", async () => {
    const checks: VerificationCheck[] = [
      {
        id: "pass-check",
        description: "pass",
        command: ["bun", "-e", "process.exit(0)"],
      },
      {
        id: "fail-check",
        description: "fail",
        command: ["bun", "-e", "process.exit(2)"],
      },
    ];

    const results = await runVerificationChecklist(checks, process.cwd());

    expect(results).toHaveLength(2);
    expect(results[0]?.id).toBe("pass-check");
    expect(results[0]?.success).toBe(true);
    expect(results[1]?.id).toBe("fail-check");
    expect(results[1]?.success).toBe(false);
    expect(results[1]?.exitCode).toBe(2);
  });
});
