import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const ROOT = process.cwd();

async function exists(relativePath: string): Promise<boolean> {
  return Bun.file(join(ROOT, relativePath)).exists();
}

async function readFixture(relativePath: string): Promise<string> {
  return Bun.file(join(ROOT, relativePath)).text();
}

function expectedBehaviorBlocks(content: string): string[] {
  return content.match(/Expected behavior:\n(?:- .+\n?)+/g) ?? [];
}

function assertStructuredSectionsAreCoherent(content: string, sectionLabel: "Prompt" | "Turn"): void {
  const headingPattern = new RegExp(`^## ${sectionLabel} \\d+`, "gm");
  const matches = [...content.matchAll(headingPattern)];

  expect(matches.length).toBeGreaterThan(0);

  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index]?.index ?? 0;
    const end = matches[index + 1]?.index ?? content.length;
    const section = content.slice(start, end);

    expect(section).toContain(`## ${sectionLabel}`);
    expect(section).toMatch(/Expected behavior:\n(?:- .+\n?)+/);

    if (sectionLabel === "Turn") {
      expect(section).toMatch(/User: ".+"/);
    } else {
      expect(section).toMatch(/".+"/);
    }
  }
}

function meaningfulPromptLines(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ") || line.startsWith('"'));
}

async function expectPromptFixture(relativePath: string): Promise<void> {
  expect(await exists(relativePath)).toBe(true);

  const content = await readFixture(relativePath);
  expect(content.startsWith("# ")).toBe(true);

  const structuredSections = content.match(/## Prompt \d+/g) ?? [];
  const behaviorBlocks = expectedBehaviorBlocks(content);

  if (structuredSections.length > 0 || behaviorBlocks.length > 0) {
    expect(content.includes("## Prompt 1")).toBe(true);
    expect(behaviorBlocks.length).toBeGreaterThan(0);
    assertStructuredSectionsAreCoherent(content, "Prompt");

    for (const block of behaviorBlocks) {
      const bullets = block.split("\n").filter((line) => line.startsWith("- "));
      expect(bullets.length).toBeGreaterThan(0);
      for (const bullet of bullets) {
        expect(bullet.replace(/^-\s+/, "").trim().length).toBeGreaterThan(8);
      }
    }

    return;
  }

  const prompts = meaningfulPromptLines(content);
  expect(prompts.length).toBeGreaterThanOrEqual(2);
  for (const prompt of prompts) {
    expect(prompt.replace(/^[-"]\s*/, "").trim().length).toBeGreaterThan(20);
  }
}

async function expectMultiTurnFixture(relativePath: string): Promise<void> {
  expect(await exists(relativePath)).toBe(true);

  const content = await readFixture(relativePath);
  expect(content.startsWith("# ")).toBe(true);
  expect(content.includes("## Turn 1")).toBe(true);
  assertStructuredSectionsAreCoherent(content, "Turn");
}

describe("prompt fixture suites", () => {
  test("rejects prompt fixtures whose prompt sections lack a nearby expected behavior block", () => {
    const content = `# Example\n\n## Prompt 1\n\n"Do the thing."\n\n## Prompt 2\n\n"Do the other thing."\n\nExpected behavior:\n- load the right skill\n`;

    expect(() => assertStructuredSectionsAreCoherent(content, "Prompt")).toThrow(
      "Expected behavior",
    );
  });

  test("rejects multi-turn fixtures that only provide one behavior block for the whole file", () => {
    const content = `# Example\n\n## Turn 1\n\nUser: "Start here."\n\n## Turn 2\n\nUser: "Now continue."\n\nExpected behavior:\n- stay coherent\n`;

    expect(() => assertStructuredSectionsAreCoherent(content, "Turn")).toThrow(
      "Expected behavior",
    );
  });

  test("ships structured skill-triggering fixtures for core workflow skills", async () => {
    for (const fixture of [
      "tests/skill-triggering/using-agentic-prompts.md",
      "tests/skill-triggering/brainstorm-prompts.md",
      "tests/skill-triggering/executing-plans-prompts.md",
      "tests/skill-triggering/tdd-prompts.md",
      "tests/skill-triggering/subagent-driven-development-prompts.md",
      "tests/skill-triggering/persona-agent-routing-prompts.md",
      "tests/skill-triggering/worktree-routing-prompts.md",
      "tests/skill-triggering/review-spec-prompts.md",
      "tests/skill-triggering/review-quality-prompts.md",
      "tests/skill-triggering/review-security-prompts.md",
      "tests/skill-triggering/gate-prompts.md",
    ] as const) {
      await expectPromptFixture(fixture);
    }
  });

  test("ships structured explicit skill-request fixtures", async () => {
    for (const fixture of [
      "tests/explicit-skill-requests/using-agentic-prompts.md",
      "tests/explicit-skill-requests/plan-prompts.md",
      "tests/explicit-skill-requests/requesting-code-review-prompts.md",
      "tests/explicit-skill-requests/verify-prompts.md",
      "tests/explicit-skill-requests/brainstorm-prompts.md",
      "tests/explicit-skill-requests/tdd-prompts.md",
    ] as const) {
      await expectPromptFixture(fixture);
    }
  });

  test("ships structured multi-turn workflow fixtures", async () => {
    for (const fixture of [
      "tests/multi-turn-workflows/brainstorm-to-plan.md",
      "tests/multi-turn-workflows/tdd-to-verify.md",
      "tests/multi-turn-workflows/subagent-review-loop.md",
      "tests/multi-turn-workflows/persona-orchestration.md",
      "tests/multi-turn-workflows/worktree-before-coder.md",
      "tests/multi-turn-workflows/using-agentic-to-plan.md",
    ] as const) {
      await expectMultiTurnFixture(fixture);
    }
  });

  test("ships structured skill-triggering fixtures for superpowers-gap skills", async () => {
    for (const fixture of [
      "tests/skill-triggering/systematic-debugging-prompts.md",
      "tests/skill-triggering/dispatching-parallel-agents-prompts.md",
      "tests/skill-triggering/finishing-a-development-branch-prompts.md",
      "tests/skill-triggering/requesting-code-review-prompts.md",
      "tests/skill-triggering/receiving-code-review-prompts.md",
    ] as const) {
      await expectPromptFixture(fixture);
    }
  });

  test("multi-turn fixtures keep user turns explicit", async () => {
    for (const fixture of [
      "tests/multi-turn-workflows/brainstorm-to-plan.md",
      "tests/multi-turn-workflows/tdd-to-verify.md",
      "tests/multi-turn-workflows/subagent-review-loop.md",
      "tests/multi-turn-workflows/persona-orchestration.md",
      "tests/multi-turn-workflows/worktree-before-coder.md",
      "tests/multi-turn-workflows/using-agentic-to-plan.md",
    ] as const) {
      const content = await readFixture(fixture);
      expect(content).toMatch(/User: ".+"/);
    }
  });
});
