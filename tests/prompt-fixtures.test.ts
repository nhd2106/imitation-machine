import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";

const ROOT = process.cwd();

const DEEPENED_FIXTURE_EXPECTATIONS = {
  "tests/skill-triggering/design-prompts.md": ["visual", "interaction"],
  "tests/skill-triggering/repo-prompts.md": ["affected", "dependency"],
  "tests/skill-triggering/adr-prompts.md": ["architectural", "decision"],
  "tests/skill-triggering/commit-prompts.md": ["verified", "conventional"],
  "tests/explicit-skill-requests/design-prompts.md": ["explicit", "`design`", "visual"],
  "tests/explicit-skill-requests/repo-prompts.md": ["explicit", "`repo`", "affected"],
  "tests/explicit-skill-requests/adr-prompts.md": ["explicit", "`adr`", "architectural"],
  "tests/explicit-skill-requests/commit-prompts.md": ["explicit", "`commit`", "conventional"],
} as const;

const EXPECTED_MATRIX_FIXTURES = {
  design: "tests/skill-triggering/design-prompts.md",
  repo: "tests/skill-triggering/repo-prompts.md",
  adr: "tests/skill-triggering/adr-prompts.md",
  commit: "tests/skill-triggering/commit-prompts.md",
} as const;

const EXPECTED_MULTI_TURN_DEPTH = {
  "tests/multi-turn-workflows/using-agentic-to-tdd-to-verify.md": [
    "using-agentic",
    "tdd",
    "verify",
    "failing test",
    "fresh verification",
  ],
  "tests/multi-turn-workflows/requesting-to-receiving-code-review.md": [
    "requesting-code-review",
    "receiving-code-review",
    "review request",
    "review feedback",
  ],
  "tests/multi-turn-workflows/subagent-review-loop.md": [
    "subagent-driven-development",
    "review-spec",
    "review-quality",
    "no skipped stage",
  ],
  "tests/multi-turn-workflows/worktree-before-coder.md": [
    "worktree",
    "coder",
    "release",
  ],
} as const;

const OUTDATED_MATRIX_GAP_PHRASES = [
  "no prompt-fixture evals",
  "no visual companion or prompt-fixture coverage",
  "no prompt-fixture tests for spec-review behavior",
  "no prompt-fixture tests for severity and scope discipline",
] as const;

const STRONG_INTENT_PHRASES = {
  design: ["visual direction", "interaction"],
  repo: ["affected package", "dependency impact", "monorepo"],
  adr: ["architectural decision", "expensive to reverse", "public contract"],
  commit: ["conventional commit", "traceability", "verified"],
  "subagent-driven-development": ["task by task", "fresh workers", "review gates"],
  "review-quality": ["review quality", "maintainability", "severity calibration"],
  "review-security": ["review security", "security finding", "severity"],
  "review-spec": ["review spec", "spec review", "compliance"],
  "requesting-code-review": ["review request", "ask for review", "reviewers should focus"],
  "receiving-code-review": ["review comments", "review feedback", "fix summary"],
  "systematic-debugging": ["hypothesis log", "systematic debugging", "reproducible"],
  "dispatching-parallel-agents": ["parallel", "independent", "runtime agents"],
  "finishing-a-development-branch": ["finish the branch", "branch-finish", "handoff"],
} as const satisfies Record<string, readonly string[]>;

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

function getComparisonMatrixRow(content: string, skill: string): string {
  const row = content
    .split("\n")
    .find((line) => line.startsWith(`| \`${skill}\` |`));

  expect(row, `${skill} matrix row should exist`).toBeDefined();
  return row ?? "";
}

function comparisonMatrixColumns(row: string): string[] {
  return row
    .split("|")
    .slice(1, -1)
    .map((column) => column.trim());
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

function strongIntentTokens(relativePath: string): string[] {
  const slug = basename(relativePath, ".md").replace(/-prompts$/, "");
  const mapped = STRONG_INTENT_PHRASES[slug as keyof typeof STRONG_INTENT_PHRASES];

  if (mapped) {
    return [...mapped];
  }

  const phrase = slug.replaceAll("-", " ");
  return slug.includes("-") ? [phrase] : [phrase, `\`${slug}\``];
}

function assertStructuredPromptContent(content: string): void {
  const behaviorBlocks = expectedBehaviorBlocks(content);

  expect(content.includes("## Prompt 1")).toBe(true);
  expect(behaviorBlocks.length).toBeGreaterThan(0);
  assertStructuredSectionsAreCoherent(content, "Prompt");

  for (const block of behaviorBlocks) {
    const bullets = block.split("\n").filter((line) => line.startsWith("- "));
    expect(bullets.length).toBeGreaterThan(0);
    for (const bullet of bullets) {
      expect(bullet.replace(/^\-\s+/, "").trim().length).toBeGreaterThan(8);
    }
  }
}

function assertFixtureIntentAlignment(relativePath: string, content: string): void {
  const intent = inferFixtureIntent(relativePath);
  const lowerContent = content.toLowerCase();
  const strongMatches = strongIntentTokens(relativePath).filter((token) =>
    lowerContent.includes(token.toLowerCase()),
  );

  if (relativePath.includes("tests/explicit-skill-requests/")) {
    expect(intent.kind).toBe("skill");
    expect(content.includes(`\`${intent.tokens[0]}\``)).toBe(true);
    expect(lowerContent).toContain("explicit");
    expect(strongMatches.length).toBeGreaterThan(0);
    return;
  }

  if (intent.kind === "skill") {
    expect(strongMatches.length).toBeGreaterThan(0);
    if (content.includes("## Prompt 1")) {
      expect(content.includes("Expected behavior:")).toBe(true);
    }
  } else {
    expect(content.includes("@")).toBe(true);
  }
}

async function expectPromptFixture(
  relativePath: string,
  options?: { requireStructuredPrompts?: boolean },
): Promise<void> {
  expect(await exists(relativePath)).toBe(true);

  const content = await readFixture(relativePath);
  expect(content.startsWith("# ")).toBe(true);

  if (options?.requireStructuredPrompts) {
    assertStructuredPromptContent(content);
    return;
  }

  const structuredSections = content.match(/## Prompt \d+/g) ?? [];
  const behaviorBlocks = expectedBehaviorBlocks(content);

  if (structuredSections.length > 0 || behaviorBlocks.length > 0) {
    assertStructuredPromptContent(content);
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

  test("rejects explicit skill-request fixtures that use the old loose fallback format", () => {
    const content = `# Example\n\n- Please use \`design\` explicitly for this page.\n- Keep the visual direction clear.`;

    expect(() => assertStructuredPromptContent(content)).toThrow();
  });

  test("rejects mislabeled fixtures satisfied only by weak token fragments", () => {
    const content = `# Example\n\n## Prompt 1\n\n"Please do a quality pass on this repo."\n\nExpected behavior:\n- review the repo carefully\n`;

    expect(() =>
      assertFixtureIntentAlignment("tests/skill-triggering/review-quality-prompts.md", content),
    ).toThrow();
  });

  test("ships structured skill-triggering fixtures", async () => {
    for (const fixture of await fixturePaths("tests/skill-triggering")) {
      await expectPromptFixture(fixture, { requireStructuredPrompts: true });
    }
  });

  test("ships structured explicit skill-request fixtures", async () => {
    for (const fixture of await fixturePaths("tests/explicit-skill-requests")) {
      await expectPromptFixture(fixture, { requireStructuredPrompts: true });
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

  test("ships the bounded eval deepening fixtures for design, repo, adr, and commit", async () => {
    for (const [fixture, requiredPhrases] of Object.entries(DEEPENED_FIXTURE_EXPECTATIONS)) {
      expect(await exists(fixture), `${fixture} should exist`).toBe(true);

      const content = await readFixture(fixture).then((value) => value.toLowerCase());
      for (const phrase of requiredPhrases) {
        expect(content).toContain(phrase.toLowerCase());
      }
    }
  });

  test("multi-turn fixtures keep user turns explicit", async () => {
    for (const fixture of await fixturePaths("tests/multi-turn-workflows")) {
      const content = await readFixture(fixture);
      expect(content).toMatch(/User: ".+"/);
    }
  });

  test("ships deeper multi-turn workflow fixtures and stage order", async () => {
    for (const [fixture, requiredPhrases] of Object.entries(EXPECTED_MULTI_TURN_DEPTH)) {
      expect(await exists(fixture), `${fixture} should exist`).toBe(true);

      const content = await readFixture(fixture).then((value) => value.toLowerCase());
      for (const phrase of requiredPhrases) {
        expect(content).toContain(phrase.toLowerCase());
      }
    }
  });

  test("comparison matrix reflects deeper multi-turn workflow coverage honestly", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");

    for (const skill of [
      "using-agentic",
      "tdd",
      "verify",
      "subagent-driven-development",
      "review-spec",
      "review-quality",
      "requesting-code-review",
      "receiving-code-review",
      "worktree",
      "release",
    ] as const) {
      const row = getComparisonMatrixRow(content, skill);
      expect(row.toLowerCase()).toContain("multi-turn");
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

    for (const phrase of OUTDATED_MATRIX_GAP_PHRASES) {
      expect(content.includes(phrase)).toBe(false);
    }
  });

  test("comparison matrix routes design, repo, adr, and commit to real fixtures", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");

    for (const [skill, expectedPath] of Object.entries(EXPECTED_MATRIX_FIXTURES)) {
      const row = getComparisonMatrixRow(content, skill);
      const columns = comparisonMatrixColumns(row);
      const evalCoverage = columns[4]?.toLowerCase() ?? "";
      const remainingGap = columns[5]?.toLowerCase() ?? "";

      expect(row).toContain(`\`${skill}\``);
      expect(row).toContain(`\`${expectedPath}\``);
      expect(evalCoverage).toBe("partial");
      expect(remainingGap).not.toContain("still lacks");
    }
  });
});
