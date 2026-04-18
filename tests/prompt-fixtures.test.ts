import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";

const ROOT = process.cwd();

function expectContainsAll(content: string, fragments: readonly string[]): void {
  for (const fragment of fragments) {
    expect(content).toContain(fragment);
  }
}

function expectContainsAny(content: string, fragments: readonly string[]): void {
  expect(fragments.some((fragment) => content.includes(fragment))).toBe(true);
}

const DEEPENED_FIXTURE_EXPECTATIONS = {
  "tests/skill-triggering/design-prompts.md": [
    ["visual direction", "aesthetic direction"],
    ["interaction quality", "responsive layout"],
    ["browser validation", "browser"],
  ],
  "tests/skill-triggering/verify-prompts.md": [
    ["exact reproduction", "exact repro"],
    ["smoke test", "partial check"],
    ["ready for review", "done"],
  ],
  "tests/skill-triggering/gate-prompts.md": [["coverage"], ["typecheck"], ["security scan", "security"]],
  "tests/skill-triggering/pr-prompts.md": [
    ["what shipped together", "shipped together"],
    ["draft pr", "draft"],
    ["failing check", "blocking verification", "gone green"],
  ],
  "tests/skill-triggering/release-prompts.md": [["semver"], ["packaging", "package artifact"], ["release evidence", "handoff"]],
  "tests/skill-triggering/repo-prompts.md": [["base branch"], ["transitive dependency", "dependency impact"], ["full run", "full repo"]],
  "tests/skill-triggering/adr-prompts.md": [["team is in a hurry", "schedule pressure"], ["public contract"], ["expensive to reverse", "painful to unwind"]],
  "tests/skill-triggering/commit-prompts.md": [["hook failure", "hook"], ["no-bypass", "bypass"], ["follow-up commit", "follow up commit"]],
  "tests/skill-triggering/executing-plans-prompts.md": [
    ["approved plan", "plan is approved"],
    ["execute the next task", "work through the plan", "inline"],
    ["verification evidence", "verification", "proof"],
    ["stop if", "re-evaluate", "scope grows"],
  ],
  "tests/skill-triggering/dispatching-parallel-agents-prompts.md": [
    ["parallel", "independent", "separate"],
    ["shared state", "same file", "overlapping ownership"],
    ["one person", "one place", "bring the results back together"],
  ],
  "tests/skill-triggering/review-security-prompts.md": [
    ["auth", "authentication"],
    ["input handling", "input validation", "untrusted input"],
    ["secrets", "token", "secret"],
    ["severity", "critical", "high"],
    ["block", "blocker", "before merge"],
  ],
  "tests/skill-triggering/systematic-debugging-prompts.md": [
    ["reproduce", "reproducible", "reproduction"],
    ["hypothesis log", "hypothesis"],
    ["evidence", "narrow"],
    ["random fixes", "guessing", "fixes first"],
  ],
  "tests/explicit-skill-requests/design-prompts.md": [["explicit"], ["`design`"], ["interaction quality", "responsive layout"], ["browser validation", "browser"]],
  "tests/explicit-skill-requests/verify-prompts.md": [["explicit"], ["`verify`"], ["exact reproduction", "exact bug repro"], ["fresh evidence", "evidence"]],
  "tests/explicit-skill-requests/gate-prompts.md": [["explicit"], ["`gate`"], ["coverage"], ["security scan", "security"]],
  "tests/explicit-skill-requests/pr-prompts.md": [["explicit"], ["`pr`"], ["draft pr", "draft"], ["what shipped together", "shipped together"]],
  "tests/explicit-skill-requests/release-prompts.md": [["explicit"], ["`release`"], ["semver"], ["release evidence", "ready or blocked"]],
  "tests/explicit-skill-requests/repo-prompts.md": [["explicit"], ["`repo`"], ["base branch", "release branch"], ["transitive dependency", "dependency impact"]],
  "tests/explicit-skill-requests/adr-prompts.md": [["explicit"], ["`adr`"], ["public contract"], ["expensive to reverse", "painful to unwind"]],
  "tests/explicit-skill-requests/commit-prompts.md": [["explicit"], ["`commit`"], ["hook failure", "hook"], ["follow-up commit", "follow up commit"]],
  "tests/explicit-skill-requests/executing-plans-prompts.md": [
    ["explicit"],
    ["`executing-plans`"],
    ["approved plan", "approved task"],
    ["work through the plan", "inline", "one planned task at a time"],
  ],
  "tests/explicit-skill-requests/dispatching-parallel-agents-prompts.md": [
    ["explicit"],
    ["`dispatching-parallel-agents`"],
    ["parallel", "independent", "split this up"],
    ["shared state", "same file", "bring the results back together"],
  ],
  "tests/explicit-skill-requests/review-security-prompts.md": [
    ["explicit"],
    ["`review-security`"],
    ["security review", "security-focused review"],
    ["critical", "high", "severity"],
    ["quality review", "generic quality"],
  ],
  "tests/explicit-skill-requests/systematic-debugging-prompts.md": [
    ["explicit"],
    ["`systematic-debugging`"],
    ["reproduce", "reproduction"],
    ["hypothesis log", "evidence"],
  ],
  "tests/skill-triggering/worktree-prompts.md": [["merged cleanup order", "merged cleanup"], ["uncommitted work", "uncommitted changes"], ["remote branch deletion", "remote branch"]],
  "tests/explicit-skill-requests/worktree-prompts.md": [["explicit"], ["`worktree`"], ["local merged-branch cleanup", "local branch"], ["remote branch deletion", "remote branch"]],
  "tests/skill-triggering/finishing-a-development-branch-prompts.md": [["uncommitted work", "uncommitted changes"], ["merged-cleanup sequencing", "merged cleanup"], ["remote deletion optional", "optional remote deletion"]],
} as const;

const EXPECTED_MATRIX_FIXTURES = {
  design: "tests/skill-triggering/design-prompts.md",
} as const;

const EXPECTED_PRESSURE_MATRIX_FIXTURES = {
  verify: "tests/explicit-skill-requests/verify-prompts.md",
  gate: "tests/explicit-skill-requests/gate-prompts.md",
  pr: "tests/explicit-skill-requests/pr-prompts.md",
  release: "tests/explicit-skill-requests/release-prompts.md",
  repo: "tests/explicit-skill-requests/repo-prompts.md",
  adr: "tests/explicit-skill-requests/adr-prompts.md",
  commit: "tests/explicit-skill-requests/commit-prompts.md",
  "executing-plans": "tests/explicit-skill-requests/executing-plans-prompts.md",
  "dispatching-parallel-agents": "tests/explicit-skill-requests/dispatching-parallel-agents-prompts.md",
  "review-security": "tests/explicit-skill-requests/review-security-prompts.md",
  "systematic-debugging": "tests/explicit-skill-requests/systematic-debugging-prompts.md",
} as const;

const EXPLICIT_PER_PROMPT_FIXTURES = [
  "tests/explicit-skill-requests/using-agentic-prompts.md",
  "tests/explicit-skill-requests/tdd-prompts.md",
  "tests/explicit-skill-requests/plan-prompts.md",
  "tests/explicit-skill-requests/brainstorm-prompts.md",
  "tests/explicit-skill-requests/design-prompts.md",
  "tests/explicit-skill-requests/worktree-prompts.md",
  "tests/explicit-skill-requests/requesting-code-review-prompts.md",
  "tests/explicit-skill-requests/verify-prompts.md",
  "tests/explicit-skill-requests/gate-prompts.md",
  "tests/explicit-skill-requests/pr-prompts.md",
  "tests/explicit-skill-requests/release-prompts.md",
  "tests/explicit-skill-requests/repo-prompts.md",
  "tests/explicit-skill-requests/adr-prompts.md",
  "tests/explicit-skill-requests/commit-prompts.md",
  "tests/explicit-skill-requests/executing-plans-prompts.md",
  "tests/explicit-skill-requests/dispatching-parallel-agents-prompts.md",
  "tests/explicit-skill-requests/review-security-prompts.md",
  "tests/explicit-skill-requests/systematic-debugging-prompts.md",
] as const;

const AVOID_JARGON_PHRASES = {
  "tests/skill-triggering/verify-prompts.md": ["confidence-only"],
  "tests/skill-triggering/pr-prompts.md": ["grouped tasks traceability"],
  "tests/skill-triggering/repo-prompts.md": ["comparison base uncertainty", "scoped-vs-full"],
  "tests/skill-triggering/review-security-prompts.md": ["severity-oriented"],
  "tests/skill-triggering/systematic-debugging-prompts.md": ["fix-jumping"],
  "tests/explicit-skill-requests/systematic-debugging-prompts.md": ["fix-jumping"],
  "tests/skill-triggering/executing-plans-prompts.md": ["direct lane"],
  "tests/explicit-skill-requests/executing-plans-prompts.md": ["direct lane"],
  "tests/skill-triggering/dispatching-parallel-agents-prompts.md": ["safe parallelism", "safe parallel fanout", "merge coordinator"],
  "tests/explicit-skill-requests/dispatching-parallel-agents-prompts.md": ["safe parallel fanout", "merge coordinator"],
  "tests/multi-turn-workflows/dispatching-parallel-agents-safe-fanout.md": ["safe parallel fanout", "merge coordinator"],
} as const;

const DISTINCT_SCENARIO_EXPECTATIONS = {
  "tests/skill-triggering/review-security-prompts.md": [
    [/auth|authorization/, /input|validation|untrusted input/, /block|merge/],
    [/secret|token/, /severity|high-severity|critical|high/],
    [/deadline pressure|waved through/, /auth bypass|secret leakage|logs/],
  ],
  "tests/explicit-skill-requests/review-security-prompts.md": [
    [/auth rollout|password-reset endpoint/, /security review/, /generic quality review|style notes/],
    [/secrets|token/, /untrusted input|validation/, /blocker|blocking/],
  ],
  "tests/skill-triggering/systematic-debugging-prompts.md": [
    [/fails sometimes|intermittent|flaky/, /reproduce|reproduction/],
    [/hypothesis log/, /evidence-based narrowing|evidence/],
    [/patch three files|random fixes/, /debug systematically|slow this down/],
  ],
  "tests/explicit-skill-requests/systematic-debugging-prompts.md": [
    [/reproduce|reproducible/, /hypothesis log|logged hypotheses/],
    [/random patches/, /evidence/, /likely cause|narrows the cause/],
  ],
  "tests/skill-triggering/dispatching-parallel-agents-prompts.md": [
    [/parallel|split/, /independent|independence/],
    [/shared state|same file|overlapping ownership/, /refuse|do not split|not parallel/],
    [/bring the results back together|one place|one person/, /conflict|contradiction|final answer|synthesis/],
  ],
  "tests/explicit-skill-requests/dispatching-parallel-agents-prompts.md": [
    [/`dispatching-parallel-agents`/, /parallel|split this up|independent/],
    [/shared state|same file/, /refuse|keep together|not independent/],
    [/bring the results back together|one place|one person/, /resolve contradictions|contradiction|conflict/],
  ],
  "tests/multi-turn-workflows/systematic-debugging-to-fix.md": [
    [/production-only|intermittent/, /reproduce first/],
    [/hypothesis log/, /evidence/],
    [/fix handoff|bounded fix plan/, /evidence trail|cause is narrowed/],
  ],
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
  "tests/multi-turn-workflows/design-to-browser-validation.md": [
    "design",
    "direction lock",
    "implementation handoff",
    "browser validation",
  ],
  "tests/multi-turn-workflows/systematic-debugging-to-fix.md": [
    "systematic-debugging",
    "reproduce first",
    "hypothesis log",
    "fix handoff",
  ],
  "tests/multi-turn-workflows/verify-to-gate-to-pr.md": [
    "verify",
    "gate",
    "pr",
    "fresh verification",
    "draft pr",
  ],
  "tests/multi-turn-workflows/release-to-finishing-a-development-branch.md": [
    "release",
    "finishing-a-development-branch",
    "release evidence",
    "finish the branch",
  ],
  "tests/multi-turn-workflows/repo-to-plan-to-subagent-driven-development.md": [
    "repo",
    "plan",
    "subagent-driven-development",
    "affected package",
    "task by task",
  ],
  "tests/multi-turn-workflows/plan-to-executing-plans.md": [
    "plan",
    "executing-plans",
    "approved plan",
    "verification evidence",
    "task",
  ],
  "tests/multi-turn-workflows/dispatching-parallel-agents-safe-fanout.md": [
    "dispatching-parallel-agents",
    "parallel",
    "shared state",
    "bring the results back together",
    "contradiction",
  ],
  "tests/multi-turn-workflows/review-security-to-systematic-debugging-to-verify.md": [
    "review-security",
    "systematic-debugging",
    "verify",
    "security finding",
    "hypothesis log",
    "fresh verification",
  ],
} as const;

const EXPECTED_MULTI_TURN_PROGRESSIONS = {
  "tests/multi-turn-workflows/verify-to-gate-to-pr.md": [
    ["`verify`", "agentic verify all", "coverage 81.4%", "typecheck clean", "112 tests passed"],
    ["`gate`", "coverage 79.8%", "security scan", "blocking", "cve-2026-4101"],
    ["`pr`", "coverage 82.1%", "security scan clean", "draft pr", "what shipped together"],
  ],
  "tests/multi-turn-workflows/release-to-finishing-a-development-branch.md": [
    ["`release`", "v1.4.2", "release evidence", "dist/imitation-machine-1.4.2.tgz", "sha256:9f3c"],
    ["`finishing-a-development-branch`", "v1.4.2", "merged into `main`", "release evidence", "branch cleanup"],
    ["git status: clean", "safe local cleanup", "git branch -d release/v1.4.2", "remote deletion is optional"],
  ],
  "tests/multi-turn-workflows/repo-to-plan-to-subagent-driven-development.md": [
    ["`repo`", "packages/web", "packages/build-utils", "dependency impact", "base branch `origin/main`"],
    ["`plan`", "pln-742", "tsk-201", "tsk-202", "packages/build-utils"],
    ["`subagent-driven-development`", "pln-742", "tsk-201", "tsk-202", "fresh workers", "review gates"],
  ],
  "tests/multi-turn-workflows/plan-to-executing-plans.md": [
    ["`plan`", "approved", "task", "verification evidence"],
    ["`executing-plans`", "approved plan", "next task", "verification evidence"],
    ["`executing-plans`", "carry forward", "verification evidence", "stop if"],
  ],
  "tests/multi-turn-workflows/dispatching-parallel-agents-safe-fanout.md": [
    ["`dispatching-parallel-agents`", "independent checks", "parallel", "safety check"],
    ["shared state", "same file", "keep together", "not safe to split", "contradiction"],
    ["bring the results back together", "resolve contradictions", "single synthesis", "verification evidence"],
  ],
  "tests/multi-turn-workflows/review-security-to-systematic-debugging-to-verify.md": [
    ["`review-security`", "sec-17", "auth bypass", "token leakage", "high severity"],
    ["`systematic-debugging`", "sec-17", "hypothesis log", "h-3", "reproduce"],
    ["`verify`", "sec-17", "h-3", "agentic verify all", "fresh verification", "password-reset flow"],
  ],
} as const;

const STRONG_INTENT_PHRASES = {
  design: ["visual direction", "interaction quality", "browser validation"],
  repo: ["affected package", "dependency impact", "monorepo"],
  adr: ["architectural decision", "expensive to reverse", "public contract"],
  commit: ["conventional commit", "traceability", "verified"],
  "subagent-driven-development": ["task by task", "fresh workers", "review gates"],
  "executing-plans": ["approved plan", "one planned task at a time", "work through the plan"],
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
      expect(section).toMatch(/^".+"$/m);
    }
  }
}

function structuredPromptSections(content: string): string[] {
  const headingPattern = /^## Prompt \d+/gm;
  const matches = [...content.matchAll(headingPattern)];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? content.length;
    return content.slice(start, end);
  });
}

function structuredSections(content: string, sectionLabel: "Prompt" | "Turn"): string[] {
  const headingPattern = new RegExp(`^## ${sectionLabel} \\d+`, "gm");
  const matches = [...content.matchAll(headingPattern)];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? content.length;
    return content.slice(start, end);
  });
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

function assertExplicitRequestPromptSections(relativePath: string, content: string): void {
  const intent = inferFixtureIntent(relativePath);

  expect(intent.kind).toBe("skill");

  for (const section of structuredPromptSections(content)) {
    const promptLine = section.match(/"(.+)"/)?.[1] ?? "";
    const lowerPromptLine = promptLine.toLowerCase();
    const lowerSection = section.toLowerCase();

    expect(lowerPromptLine).toContain("explicit");
    expect(promptLine).toContain(`\`${intent.tokens[0]}\``);
    expect(lowerSection).toMatch(/expected behavior:\n(?:- .+\n?)+/);
    expect(lowerSection).toMatch(/- .*(load|honor|interpret)/);
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

function assertDistinctScenarioCoverage(
  sections: readonly string[],
  scenarios: readonly (readonly RegExp[])[],
): void {
  const candidateSectionIndexes = scenarios.map((scenarioMatchers) =>
    sections
      .map((section, index) =>
        scenarioMatchers.every((matcher) => matcher.test(section.toLowerCase())) ? index : -1,
      )
      .filter((index) => index >= 0),
  );

  for (const candidates of candidateSectionIndexes) {
    expect(candidates.length).toBeGreaterThan(0);
  }

  const assignedSections = new Set<number>();

  for (const candidates of [...candidateSectionIndexes].sort((left, right) => left.length - right.length)) {
    const distinctCandidate = candidates.find((index) => !assignedSections.has(index));
    assignedSections.add(distinctCandidate ?? candidates[0]!);
  }

  expect(assignedSections.size).toBeGreaterThanOrEqual(scenarios.length);
}

function assertTurnLevelProgression(content: string, turnExpectations: readonly (readonly string[])[]): void {
  const turns = structuredSections(content, "Turn");
  expect(turns.length).toBeGreaterThanOrEqual(turnExpectations.length);

  for (const [index, requiredFragments] of turnExpectations.entries()) {
    const turn = turns[index] ?? "";
    const lowerTurn = turn.toLowerCase();

    for (const fragment of requiredFragments) {
      expect(lowerTurn, `turn ${index + 1} should contain ${fragment}`).toContain(fragment.toLowerCase());
    }
  }
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

  test("rejects sections satisfied only by incidental quoted text instead of a dedicated prompt line", () => {
    const content = `# Example\n\n## Prompt 1\n\nContext: the reviewer wrote "please help" in a log snippet.\n\nExpected behavior:\n- load the right skill\n`;

    expect(() => assertStructuredSectionsAreCoherent(content, "Prompt")).toThrow();
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

  test("rejects explicit request fixtures when any prompt is only implicitly routed", () => {
    const content = `# Example\n\n## Prompt 1\n\n"Use \`plan\` explicitly for this approved requirement."\n\nExpected behavior:\n- load \`plan\`\n- honor the explicit request\n\n## Prompt 2\n\n"The requirement is approved. Write the implementation plan now."\n\nExpected behavior:\n- move to planning\n`;

    expect(() =>
      assertExplicitRequestPromptSections(
        "tests/explicit-skill-requests/plan-prompts.md",
        content,
      ),
    ).toThrow();
  });

  test("rejects distinct scenario suites when three declared scenarios collapse onto only two sections", () => {
    const sections = ["scenario alpha beta", "scenario gamma"];

    const scenarios = [[/alpha/], [/beta/], [/gamma/]] as const;

    expect(() => assertDistinctScenarioCoverage(sections, scenarios)).toThrow();
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

  test("bounded explicit skill-request fixtures keep each prompt explicitly requested", async () => {
    for (const fixture of EXPLICIT_PER_PROMPT_FIXTURES) {
      const content = await readFixture(fixture);
      assertExplicitRequestPromptSections(fixture, content);
    }
  });

  test("ships the bounded eval deepening fixtures for the current pressure-wave skills", async () => {
    for (const [fixture, requiredPhrases] of Object.entries(DEEPENED_FIXTURE_EXPECTATIONS)) {
      expect(await exists(fixture), `${fixture} should exist`).toBe(true);

      const content = await readFixture(fixture).then((value) => value.toLowerCase());
      for (const theme of requiredPhrases) {
        expectContainsAny(content, theme.map((phrase) => phrase.toLowerCase()));
      }
    }
  });

  test("new security and debugging fixtures cover distinct scenarios without collapsing into one repeated case", async () => {
    for (const [fixture, scenarios] of Object.entries(DISTINCT_SCENARIO_EXPECTATIONS)) {
      const content = await readFixture(fixture);
      const sections = fixture.includes("multi-turn-workflows")
        ? structuredSections(content, "Turn")
        : structuredSections(content, "Prompt");

      assertDistinctScenarioCoverage(sections, scenarios);
    }
  });

  test("pressure fixtures avoid brittle repo-internal jargon while keeping realistic phrasing", async () => {
    for (const [fixture, forbiddenPhrases] of Object.entries(AVOID_JARGON_PHRASES)) {
      const content = await readFixture(fixture).then((value) => value.toLowerCase());

      for (const phrase of forbiddenPhrases) {
        expect(content).not.toContain(phrase.toLowerCase());
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

  test("new bounded workflow fixtures preserve ordered stage progression with carried evidence", async () => {
    for (const [fixture, turnExpectations] of Object.entries(EXPECTED_MULTI_TURN_PROGRESSIONS)) {
      const content = await readFixture(fixture);
      assertTurnLevelProgression(content, turnExpectations);
    }
  });

  test("comparison matrix reflects deeper multi-turn workflow coverage honestly", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");

    for (const skill of [
      "using-agentic",
      "tdd",
      "verify",
      "gate",
      "pr",
      "release",
      "finishing-a-development-branch",
      "repo",
        "plan",
        "executing-plans",
        "subagent-driven-development",
      "review-spec",
      "review-quality",
      "review-security",
        "requesting-code-review",
        "receiving-code-review",
        "worktree",
        "systematic-debugging",
        "dispatching-parallel-agents",
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
  });

  test("comparison matrix routes design to a real fixture with shipped depth", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");

    for (const [skill, expectedPath] of Object.entries(EXPECTED_MATRIX_FIXTURES)) {
      const row = getComparisonMatrixRow(content, skill);
      const columns = comparisonMatrixColumns(row);
      const packageDepth = columns[3]?.toLowerCase() ?? "";
      const evalCoverage = columns[4]?.toLowerCase() ?? "";
      const remainingGap = columns[5]?.toLowerCase() ?? "";

      expect(row).toContain(`\`${skill}\``);
      expect(row).toContain(`\`${expectedPath}\``);
      expect(packageDepth).toBe("partial");
      expect(evalCoverage).toBe("partial");
      expectContainsAll(remainingGap, ["browser", "coverage"]);
    }
  });

  test("comparison matrix rows for pressure-wave skills point to the refreshed explicit fixtures", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");

    for (const [skill, expectedPath] of Object.entries(EXPECTED_PRESSURE_MATRIX_FIXTURES)) {
      const row = getComparisonMatrixRow(content, skill).toLowerCase();
      expect(row).toContain(expectedPath.toLowerCase());
      expect(row).toContain("pressure");
      expect(row).toContain("explicit-request");
      expect(row).toContain("trigger");
    }
  });

  test("comparison matrix rows for deeper review and debugging coverage stay honest", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");

    const reviewSecurityRow = getComparisonMatrixRow(content, "review-security").toLowerCase();
    expectContainsAll(reviewSecurityRow, ["trigger", "explicit-request", "severity"]);

    const systematicDebuggingRow = getComparisonMatrixRow(content, "systematic-debugging").toLowerCase();
    expectContainsAll(systematicDebuggingRow, ["trigger", "explicit-request", "multi-turn", "fix handoff"]);
  });

  test("design comparison matrix row mentions deeper package and bounded remaining gap", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");
    const row = getComparisonMatrixRow(content, "design");
    const columns = comparisonMatrixColumns(row);
    const remainingGap = (columns[5] ?? "").toLowerCase();

    expectContainsAll(remainingGap, ["direction", "browser", "gap"]);
  });

  test("worktree comparison matrix row reflects end-to-end merged cleanup support", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");
    const row = getComparisonMatrixRow(content, "worktree").toLowerCase();

    expectContainsAll(row, ["end-to-end", "optional remote deletion", "merged-worktree cleanup"]);
  });
});
