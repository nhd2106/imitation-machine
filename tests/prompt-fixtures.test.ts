import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const ROOT = process.cwd();

async function exists(relativePath: string): Promise<boolean> {
  return Bun.file(join(ROOT, relativePath)).exists();
}

describe("prompt fixture suites", () => {
  test("ships skill-triggering fixtures for core workflow skills", async () => {
    expect(await exists("tests/skill-triggering/using-agentic-prompts.md")).toBe(true);
    expect(await exists("tests/skill-triggering/brainstorm-prompts.md")).toBe(true);
    expect(await exists("tests/skill-triggering/executing-plans-prompts.md")).toBe(true);
    expect(await exists("tests/skill-triggering/tdd-prompts.md")).toBe(true);
    expect(await exists("tests/skill-triggering/subagent-driven-development-prompts.md")).toBe(true);
    expect(await exists("tests/skill-triggering/persona-agent-routing-prompts.md")).toBe(true);
    expect(await exists("tests/skill-triggering/worktree-routing-prompts.md")).toBe(true);
  });

  test("ships explicit skill-request fixtures", async () => {
    expect(await exists("tests/explicit-skill-requests/using-agentic-prompts.md")).toBe(true);
    expect(await exists("tests/explicit-skill-requests/plan-prompts.md")).toBe(true);
    expect(await exists("tests/explicit-skill-requests/requesting-code-review-prompts.md")).toBe(true);
    expect(await exists("tests/explicit-skill-requests/verify-prompts.md")).toBe(true);
  });

  test("ships multi-turn workflow fixtures", async () => {
    expect(await exists("tests/multi-turn-workflows/brainstorm-to-plan.md")).toBe(true);
    expect(await exists("tests/multi-turn-workflows/tdd-to-verify.md")).toBe(true);
    expect(await exists("tests/multi-turn-workflows/subagent-review-loop.md")).toBe(true);
    expect(await exists("tests/multi-turn-workflows/persona-orchestration.md")).toBe(true);
    expect(await exists("tests/multi-turn-workflows/worktree-before-coder.md")).toBe(true);
  });

  test("ships skill-triggering fixtures for superpowers-gap skills", async () => {
    expect(await exists("tests/skill-triggering/systematic-debugging-prompts.md")).toBe(true);
    expect(await exists("tests/skill-triggering/dispatching-parallel-agents-prompts.md")).toBe(true);
    expect(await exists("tests/skill-triggering/finishing-a-development-branch-prompts.md")).toBe(true);
    expect(await exists("tests/skill-triggering/requesting-code-review-prompts.md")).toBe(true);
    expect(await exists("tests/skill-triggering/receiving-code-review-prompts.md")).toBe(true);
  });
});
