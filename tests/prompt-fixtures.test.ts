import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { basename, join, relative } from "node:path";

const ROOT = process.cwd();

async function exists(relativePath: string): Promise<boolean> {
  return Bun.file(join(ROOT, relativePath)).exists();
}

async function readFixture(relativePath: string): Promise<string> {
  return Bun.file(join(ROOT, relativePath)).text();
}

async function fixturePaths(directory: string): Promise<string[]> {
  const entries = await readdir(join(ROOT, directory));
  return entries
    .filter((entry) => entry.endsWith(".md"))
    .sort()
    .map((entry) => join(directory, entry));
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

function inferFixtureIntent(relativePath: string): { kind: "skill" | "routing"; tokens: string[] } {
  const slug = basename(relativePath, ".md").replace(/-prompts$/, "");

  switch (slug) {
    case "persona-agent-routing":
      return { kind: "routing", tokens: ["@po", "@planner", "@coder"] };
    case "worktree-routing":
      return { kind: "routing", tokens: ["@worktree", "@coder"] };
    case "pr":
      return { kind: "skill", tokens: ["pr", "pull request"] };
    case "tdd":
      return { kind: "skill", tokens: ["tdd", "test-first", "failing test"] };
    default:
      return {
        kind: "skill",
        tokens: [slug, slug.replaceAll("-", " "), ...slug.split("-")],
      };
  }
}

function assertFixtureIntentAlignment(relativePath: string, content: string): void {
  const intent = inferFixtureIntent(relativePath);

  if (relativePath.includes("tests/explicit-skill-requests/")) {
    expect(intent.kind).toBe("skill");
    expect(content.includes(`\`${intent.tokens[0]}\``)).toBe(true);
    expect(content.toLowerCase()).toContain("explicit");
    return;
  }

  const lowerContent = content.toLowerCase();
  const matchedTokens = intent.tokens.filter((token) => lowerContent.includes(token.toLowerCase()));

  expect(matchedTokens.length).toBeGreaterThan(0);

  if (intent.kind === "skill") {
    if (content.includes("## Prompt 1")) {
      expect(content.includes("Expected behavior:")).toBe(true);
    }
  } else {
    expect(content.includes("@")).toBe(true);
  }
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

  test("ships structured skill-triggering fixtures", async () => {
    for (const fixture of await fixturePaths("tests/skill-triggering")) {
      await expectPromptFixture(fixture);
    }
  });

  test("ships structured explicit skill-request fixtures", async () => {
    for (const fixture of await fixturePaths("tests/explicit-skill-requests")) {
      await expectPromptFixture(fixture);
    }
  });

  test("ships structured multi-turn workflow fixtures", async () => {
    for (const fixture of await fixturePaths("tests/multi-turn-workflows")) {
      await expectMultiTurnFixture(fixture);
    }
  });

  test("fixtures align with their declared skill or routing intent", async () => {
    for (const directory of [
      "tests/skill-triggering",
      "tests/explicit-skill-requests",
    ] as const) {
      for (const fixture of await fixturePaths(directory)) {
        const content = await readFixture(fixture);
        assertFixtureIntentAlignment(fixture, content);
      }
    }
  });

  test("multi-turn fixtures keep user turns explicit", async () => {
    for (const fixture of await fixturePaths("tests/multi-turn-workflows")) {
      const content = await readFixture(fixture);
      expect(content).toMatch(/User: ".+"/);
    }
  });

  test("comparison matrix next-file pointers stay truthful", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");
    const pointers = [...content.matchAll(/`([^`]+)` \|$/gm)].map((match) => match[1] ?? "");

    expect(pointers.length).toBeGreaterThan(0);

    for (const pointer of pointers) {
      const existsOnDisk = await exists(pointer);
      expect(existsOnDisk, `${pointer} should exist`).toBe(true);
    }

    expect(content.includes("no prompt-fixture evals")).toBe(false);
    expect(content.includes("no visual companion or prompt-fixture coverage")).toBe(false);
    expect(content.includes("no prompt-fixture tests for spec-review behavior")).toBe(false);
    expect(content.includes("no prompt-fixture tests for severity and scope discipline")).toBe(false);
  });
});
