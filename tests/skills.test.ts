import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const ROOT = process.cwd();

function expectContainsAll(content: string, fragments: readonly string[]): void {
  for (const fragment of fragments) {
    expect(content).toContain(fragment);
  }
}

const CORE_SKILLS = [
  "using-agentic",
  "brainstorm",
  "plan",
  "executing-plans",
  "verify",
  "subagent-driven-development",
  "tdd",
  "review-security",
  "design",
] as const;

const SUPERPOWERS_GAP_SKILLS = [
  "systematic-debugging",
  "dispatching-parallel-agents",
  "finishing-a-development-branch",
  "requesting-code-review",
  "receiving-code-review",
] as const;

describe("core skill content", () => {
  test("core skills use trigger-based descriptions", async () => {
    for (const skill of CORE_SKILLS) {
      const content = await Bun.file(join(ROOT, "skills", skill, "SKILL.md")).text();
      const descriptionLine = content.split("\n").find((line) => line.startsWith("description:"));

      expect(descriptionLine).toBeDefined();
      expect(descriptionLine?.includes("Use when")).toBe(true);
    }
  });

  test("core skills include red-flag guidance", async () => {
    for (const skill of CORE_SKILLS) {
      const content = await Bun.file(join(ROOT, "skills", skill, "SKILL.md")).text();
      expect(content.includes("## Red Flags") || content.includes("## The Rule")).toBe(true);
    }
  });

  test("process skills document explicit workflow structure", async () => {
    for (const skill of ["using-agentic", "brainstorm", "plan", "executing-plans", "verify", "subagent-driven-development"] as const) {
      const content = await Bun.file(join(ROOT, "skills", skill, "SKILL.md")).text();
      expect(content.includes("```dot")).toBe(true);
    }
  });

  test("brainstorm documents a hard gate and planning transition", async () => {
    const content = await Bun.file(join(ROOT, "skills", "brainstorm", "SKILL.md")).text();
    expect(content.includes("## Hard Gate")).toBe(true);
    expect(content.includes("Only then transition to `plan`." )).toBe(true);
    expect(content.includes("Ask one question per message.")).toBe(true);
  });

  test("using-agentic is scoped to opted-in repos", async () => {
    const content = await Bun.file(join(ROOT, "skills", "using-agentic", "SKILL.md")).text();
    expect(content.includes("explicitly opts into the Imitation Machine workflow")).toBe(true);
    expect(content.includes("Do not use this just because the plugin is globally installed.")).toBe(true);
    expect(content.includes("systematic-debugging")).toBe(true);
    expect(content.includes("dispatching-parallel-agents")).toBe(true);
    expect(content.includes("finishing-a-development-branch")).toBe(true);
    expect(content.includes("requesting-code-review")).toBe(true);
    expect(content.includes("receiving-code-review")).toBe(true);
  });

  test("workflow cheatsheet mentions new workflow skills in decision points", async () => {
    const content = await Bun.file(
      join(ROOT, "skills", "using-agentic", "references", "workflow-cheatsheet.md"),
    ).text();

    expect(content.includes("systematic-debugging")).toBe(true);
    expect(content.includes("dispatching-parallel-agents")).toBe(true);
    expect(content.includes("executing-plans")).toBe(true);
    expect(content.includes("finishing-a-development-branch")).toBe(true);
    expect(content.includes("requesting-code-review")).toBe(true);
    expect(content.includes("receiving-code-review")).toBe(true);
  });

  test("workflow-facing install docs mention expanded skill inventory", async () => {
    for (const relativePath of ["README.md", "CLAUDE_INSTALL.md", "tests/claude-code/README.md"] as const) {
      const content = await Bun.file(join(ROOT, relativePath)).text();
      expect(content.includes("systematic-debugging")).toBe(true);
      expect(content.includes("dispatching-parallel-agents")).toBe(true);
      expect(content.includes("executing-plans")).toBe(true);
      expect(content.includes("finishing-a-development-branch")).toBe(true);
      expect(content.includes("requesting-code-review")).toBe(true);
      expect(content.includes("receiving-code-review")).toBe(true);
    }
  });

  test("skills comparison matrix reflects shipped executing-plans skill", async () => {
    const content = await Bun.file(join(ROOT, "docs", "skills-comparison-matrix.md")).text();

    expect(content.includes("dispatching-parallel-agents")).toBe(true);
    expect(content.includes("requesting-code-review")).toBe(true);
    expect(content.includes("receiving-code-review")).toBe(true);
    expect(content.includes("executing-plans")).toBe(true);
    expect(content.includes("shipped inline plan execution path")).toBe(true);
    expect(content.includes("teaches how to ask for review well")).toBe(false);
    expect(content.includes("later follow-up")).toBe(false);
  });

  test("brainstorm requires written spec review before planning", async () => {
    const content = await Bun.file(join(ROOT, "skills", "brainstorm", "SKILL.md")).text();
    expect(content.includes("### 5. Write The Design / Spec")).toBe(true);
    expect(content.includes("### 7. User Review Gate")).toBe(true);
  });

  test("plan includes execution handoff guidance", async () => {
    const content = await Bun.file(join(ROOT, "skills", "plan", "SKILL.md")).text();
    expect(content.includes("## Execution Handoff")).toBe(true);
    expect(content.includes("subagent-driven-development")).toBe(true);
    expect(content.includes("executing-plans")).toBe(true);
  });

  test("plan ships concrete serial and grouped example plans", async () => {
    const linearPlan = JSON.parse(
      await Bun.file(join(ROOT, "skills", "plan", "examples", "example-plan.json")).text(),
    ) as Record<string, unknown>;
    const parallelPlan = JSON.parse(
      await Bun.file(join(ROOT, "skills", "plan", "examples", "example-parallel-plan.json")).text(),
    ) as Record<string, unknown>;

    expect(linearPlan.title).toBeTruthy();
    expect(Array.isArray(linearPlan.tasks)).toBe(true);
    expect((linearPlan.tasks as Array<unknown>).length).toBeGreaterThanOrEqual(2);

    expect(parallelPlan.title).toBeTruthy();
    expect(Array.isArray(parallelPlan.taskGroups)).toBe(true);
    expect((parallelPlan.taskGroups as Array<unknown>).length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(parallelPlan)).toContain("parallel");
  });

  test("executing-plans ships workflow, red flags, and direct-execution guidance", async () => {
    const content = await Bun.file(join(ROOT, "skills", "executing-plans", "SKILL.md")).text();
    expect(content.includes("description: Use when")).toBe(true);
    expect(content.includes("## Workflow")).toBe(true);
    expect(content.includes("## Red Flags")).toBe(true);
    expect(content.includes("approved plan")).toBe(true);
    expect(content.includes("@coder")).toBe(true);
  });

  test("tdd includes examples and stronger iron law wording", async () => {
    const content = await Bun.file(join(ROOT, "skills", "tdd", "SKILL.md")).text();
    const lowerContent = content.toLowerCase();

    expect(content.includes("Good And Bad Tests")).toBe(true);
    expectContainsAll(lowerContent, ["write code before", "delete it", "start over"]);
  });

  test("verify includes a claim matrix and stronger proof guidance", async () => {
    const content = await Bun.file(join(ROOT, "skills", "verify", "SKILL.md")).text();
    const lowerContent = content.toLowerCase();

    expect(content.includes("## Claim Matrix")).toBe(true);
    expect(content.includes("Not sufficient")).toBe(true);
    expectContainsAll(lowerContent, ["confidence", "evidence", "fix", "verified", "exact command"]);
  });

  test("subagent-driven-development documents implementer status handling", async () => {
    const content = await Bun.file(join(ROOT, "skills", "subagent-driven-development", "SKILL.md")).text();
    expect(content.includes("## Implementer Status")).toBe(true);
    expect(content.includes("DONE_WITH_CONCERNS")).toBe(true);
    expect(content.includes("NEEDS_CONTEXT")).toBe(true);
    expect(content.includes("## Example Workflow")).toBe(true);
  });

  test("worktree documents safety verification and baseline checks", async () => {
    const content = await Bun.file(join(ROOT, "skills", "worktree", "SKILL.md")).text();
    expect(content.includes("## Safety Verification")).toBe(true);
    expect(content.includes("baseline")).toBe(true);
    expect(content.includes("ignored")).toBe(true);
    expect(content.includes("multiple worktrees")).toBe(true);
    expect(content.includes("clean stale local branches/worktrees safely")).toBe(true);
    expect(content.includes("merged branch") || content.includes("merged PR")).toBe(true);
    expect(content.includes("force removal")).toBe(true);
  });

  test("gate documents blocker handling and review-stage gates", async () => {
    const content = await Bun.file(join(ROOT, "skills", "gate", "SKILL.md")).text();
    const lowerContent = content.toLowerCase();

    expect(content.includes("workflow blockers")).toBe(true);
    expect(content.includes("plan --planPath")).toBe(true);
    expectContainsAll(lowerContent, ["spec", "quality", "pr", "release", "completion", "failing"]);
  });

  test("delivery skills document grouped delivery lanes and cleanup", async () => {
    const release = await Bun.file(join(ROOT, "skills", "release", "SKILL.md")).text();
    const pr = await Bun.file(join(ROOT, "skills", "pr", "SKILL.md")).text();
    const sdd = await Bun.file(join(ROOT, "skills", "subagent-driven-development", "SKILL.md")).text();

    expect(release.includes("commit + gh PR creation")).toBe(true);
    expect(release.includes("delivery units or grouped tasks")).toBe(true);
    expect(release.includes("check merged PRs")).toBe(true);
    expect(pr.includes("delivery unit")).toBe(true);
    expect(pr.includes("grouped tasks")).toBe(true);
    expect(sdd.includes("independent planned task groups")).toBe(true);
    expect(sdd.includes("shared groups stay together")).toBe(true);
  });

  test("rewritten discipline skills include workflow and red flags", async () => {
    for (const skill of ["tdd", "review-security", "design"] as const) {
      const content = await Bun.file(join(ROOT, "skills", skill, "SKILL.md")).text();
      expect(content.includes("```dot")).toBe(true);
      expect(content.includes("## Red Flags")).toBe(true);
      expect(content.includes("description: Use when")).toBe(true);
    }
  });

  test("design skill locks direction, interaction quality, and browser validation with companion docs", async () => {
    const content = await Bun.file(join(ROOT, "skills", "design", "SKILL.md")).text();
    const lowerContent = content.toLowerCase();

    expectContainsAll(lowerContent, ["direction lock", "interaction quality", "browser validation"]);
    expectContainsAll(content, [
      "references/design-reference.md",
      "references/design-direction-checklist.md",
      "references/design-brief-example.md",
    ]);
  });

  test("review and delivery skills include rewritten workflow structure", async () => {
    for (const skill of ["review-spec", "review-quality", "gate", "pr", "release"] as const) {
      const content = await Bun.file(join(ROOT, "skills", skill, "SKILL.md")).text();
      const descriptionLine = content.split("\n").find((line) => line.startsWith("description:"));
      expect(descriptionLine).toBeDefined();
      expect(descriptionLine?.includes("Use when")).toBe(true);
      expect(content.includes("```dot")).toBe(true);
      expect(content.includes("## Red Flags")).toBe(true);
    }
  });

  test("remaining workflow skills include rewritten workflow structure", async () => {
    for (const skill of ["worktree", "repo", "adr", "commit"] as const) {
      const content = await Bun.file(join(ROOT, "skills", skill, "SKILL.md")).text();
      const descriptionLine = content.split("\n").find((line) => line.startsWith("description:"));
      expect(descriptionLine).toBeDefined();
      expect(descriptionLine?.includes("Use when")).toBe(true);
      expect(content.includes("```dot")).toBe(true);
      expect(content.includes("## Red Flags")).toBe(true);
    }
  });

  test("writing-skills removes stale superpowers references", async () => {
    const skill = await Bun.file(join(ROOT, "skills", "writing-skills", "SKILL.md")).text();
    const testingReference = await Bun.file(
      join(ROOT, "skills", "writing-skills", "testing-skills-with-subagents.md"),
    ).text();

    expect(skill.includes("superpowers:")).toBe(false);
    expect(testingReference.includes("superpowers:")).toBe(false);
    expect(skill.includes("imitation-machine-local")).toBe(true);
  });

  test("superpowers-gap skills include frontmatter workflow and red flags", async () => {
    for (const skill of SUPERPOWERS_GAP_SKILLS) {
      const content = await Bun.file(join(ROOT, "skills", skill, "SKILL.md")).text();
      const descriptionLine = content.split("\n").find((line) => line.startsWith("description:"));

      expect(descriptionLine).toBeDefined();
      expect(descriptionLine?.includes("Use when")).toBe(true);
      expect(content.includes("## Workflow")).toBe(true);
      expect(content.includes("## Red Flags")).toBe(true);
    }
  });

  test("superpowers-gap skills mention runtime agents where natural", async () => {
    const debugging = await Bun.file(join(ROOT, "skills", "systematic-debugging", "SKILL.md")).text();
    const dispatching = await Bun.file(join(ROOT, "skills", "dispatching-parallel-agents", "SKILL.md")).text();
    const finishing = await Bun.file(join(ROOT, "skills", "finishing-a-development-branch", "SKILL.md")).text();
    const requesting = await Bun.file(join(ROOT, "skills", "requesting-code-review", "SKILL.md")).text();
    const review = await Bun.file(join(ROOT, "skills", "receiving-code-review", "SKILL.md")).text();

    expect(debugging.includes("runtime agent") || debugging.includes("runtime-agent")).toBe(true);
    expect(dispatching.includes("runtime agent") || dispatching.includes("runtime-agent")).toBe(true);
    expect(finishing.includes("runtime agent") || finishing.includes("runtime-agent")).toBe(true);
    expect(requesting.includes("@release")).toBe(true);
    expect(review.includes("runtime agent") || review.includes("runtime-agent")).toBe(true);
  });
});
