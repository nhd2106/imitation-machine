import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const repoRoot = process.cwd();

async function expectTimedTest(filePath: string, testName: string): Promise<void> {
  const source = await Bun.file(join(repoRoot, filePath)).text();
  expect(source).toMatch(new RegExp(`test\\(${JSON.stringify(testName)}[\\s\\S]*?,\\s*SUBPROCESS_TEST_TIMEOUT_MS\\s*\\);`));
}

describe("subprocess-heavy test time budgets", () => {
  test("assign explicit timeouts to known verification hotspots", async () => {
    await expectTimedTest("tests/orchestrate.test.ts", "executes real persona commands when not in dry-run");
    await expectTimedTest("tests/orchestrate.test.ts", "runs canonical task checks before plan-level final review and release");
    await expectTimedTest("tests/orchestrate.test.ts", "runs one final review and release only after all task verifications and plan verification");
    await expectTimedTest("tests/orchestrate.test.ts", "failed sibling blocks delivery finalization");
    await expectTimedTest("tests/orchestrate.test.ts", "runs specialized evidence personas in parallel within a task");
    await expectTimedTest("tests/orchestrate.test.ts", "keeps per-task specialized evidence personas parallel even when maxParallel limits task groups");
    await expectTimedTest("tests/orchestrate.test.ts", "stops before final review when specialized evidence fails and continueOnError is false");
    await expectTimedTest("tests/orchestrate.test.ts", "runs independent execution groups in parallel while preserving in-group order");
    await expectTimedTest("tests/orchestrate.test.ts", "keeps same execution-group tasks ordered even without dependsOnTaskIds");
    await expectTimedTest("tests/orchestrate.test.ts", "blocks a task in a different execution group until dependsOnTaskIds completes");
    await expectTimedTest("tests/typescript-baseline.test.ts", "raw repo-wide typecheck succeeds");
    await expectTimedTest("tests/verify.test.ts", "verify all tolerates a transient db lock while invoking nested gate all");
  });
});
