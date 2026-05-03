import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const ROOT = process.cwd();

function expectContainsAll(content: string, fragments: readonly string[]): void {
  for (const fragment of fragments) {
    expect(content).toContain(fragment);
  }
}

function expectOrdered(content: string, earlier: string, later: string): void {
  const earlierIndex = content.indexOf(earlier);
  const laterIndex = content.indexOf(later);

  expect(earlierIndex, `${earlier} should exist`).toBeGreaterThanOrEqual(0);
  expect(laterIndex, `${later} should exist`).toBeGreaterThanOrEqual(0);
  expect(earlierIndex, `${earlier} should appear before ${later}`).toBeLessThan(laterIndex);
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
  "review-final",
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

  test("using-agentic places fresh verification before final review and handoff", async () => {
    const content = await Bun.file(join(ROOT, "skills", "using-agentic", "SKILL.md")).text();
    const workflow = content.slice(content.indexOf("## Workflow"));

    expectContainsAll(workflow, ["task-level reviews", "agentic verify all", "review-final", "@reviewer-final", "@release / PR / handoff"]);
    expectOrdered(workflow, "task-level reviews", "agentic verify all");
    expectOrdered(workflow, "agentic verify all", "review-final");
    expectOrdered(workflow, "review-final", "@release / PR / handoff");
  });

  test("using-agentic documents canonical final sequencing", async () => {
    const content = await Bun.file(join(ROOT, "skills", "using-agentic", "SKILL.md")).text();
    const sequence = content.slice(content.indexOf("Preferred sequence:"));

    expectContainsAll(sequence, [
      "implementation and task-level `review-spec` / `review-quality`",
      "specialized checks/updates as needed: `review-security` / `@security`, `@qa`, `@docs`",
      "fresh `agentic verify all`",
      "`review-final` / `@reviewer-final`",
      "`@release` / PR / handoff",
    ]);
    expectOrdered(sequence, "implementation and task-level `review-spec` / `review-quality`", "specialized checks/updates");
    expectOrdered(sequence, "specialized checks/updates", "fresh `agentic verify all`");
    expectOrdered(sequence, "fresh `agentic verify all`", "`review-final` / `@reviewer-final`");
    expectOrdered(sequence, "`review-final` / `@reviewer-final`", "`@release` / PR / handoff");
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

  test("workflow cheatsheet includes final review after fresh verification before handoff", async () => {
    const content = await Bun.file(
      join(ROOT, "skills", "using-agentic", "references", "workflow-cheatsheet.md"),
    ).text();

    expectContainsAll(content, ["review-final", "@reviewer-final", "PR/release handoff"]);
    expectOrdered(content, "task-level reviews", "agentic verify all");
    expectOrdered(content, "agentic verify all", "review-final");
    expectOrdered(content, "review-final", "PR/release handoff");
  });

  test("public workflow docs keep docs and specialized checks before verify and final review", async () => {
    for (const relativePath of [
      "skills/using-agentic/references/workflow-cheatsheet.md",
      "README.md",
      "CONTRIBUTING.md",
      "skills/subagent-driven-development/SKILL.md",
    ] as const) {
      const content = await Bun.file(join(ROOT, relativePath)).text();
      const canonicalSequence = content.slice(content.indexOf("Canonical final sequence:"));

      expectContainsAll(canonicalSequence, ["review-spec", "review-quality", "@security", "@qa", "@docs", "agentic verify all", "@reviewer-final", "@release"]);
      expectOrdered(canonicalSequence, "review-spec", "@security");
      expectOrdered(canonicalSequence, "review-quality", "@security");
      expectOrdered(canonicalSequence, "@security", "agentic verify all");
      expectOrdered(canonicalSequence, "@qa", "agentic verify all");
      expectOrdered(canonicalSequence, "@docs", "agentic verify all");
      expectOrdered(canonicalSequence, "agentic verify all", "@reviewer-final");
      expectOrdered(canonicalSequence, "@reviewer-final", "@release");
    }
  });

  test("README tiny workflow runs verification before final review and handoff", async () => {
    const content = await Bun.file(join(ROOT, "README.md")).text();
    const start = content.indexOf("### Tiny example workflow");
    const end = content.indexOf("## Contributing");
    const tinyWorkflow = content.slice(start, end);

    expectContainsAll(tinyWorkflow, ["agentic verify all", "review-final", "@reviewer-final", "PR/release/handoff"]);
    expectOrdered(tinyWorkflow, "agentic verify all", "review-final");
    expectOrdered(tinyWorkflow, "review-final", "PR/release/handoff");
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

  test("public workflow docs mention final readiness review", async () => {
    for (const relativePath of ["README.md", "CONTRIBUTING.md", ".github/PULL_REQUEST_TEMPLATE.md"] as const) {
      const content = await Bun.file(join(ROOT, relativePath)).text();
      expect(content.includes("review-final")).toBe(true);
      expect(content.includes("@reviewer-final")).toBe(true);
    }
  });

  test("skills comparison matrix reflects shipped executing-plans skill", async () => {
    const content = await Bun.file(join(ROOT, "docs", "skills-comparison-matrix.md")).text();
    const executingPlansRow = content
      .split("\n")
      .find((line) => line.includes("| `executing-plans` |"));

    expect(content.includes("dispatching-parallel-agents")).toBe(true);
    expect(content.includes("requesting-code-review")).toBe(true);
    expect(content.includes("receiving-code-review")).toBe(true);
    expect(content.includes("executing-plans")).toBe(true);
    expect(executingPlansRow).toBeDefined();
    expect(executingPlansRow).toContain("approved-plan direct-lane pressure");
    expect(executingPlansRow).toContain("plan -> executing-plans");
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

  test("tdd documents full red-green-refactor depth and shortcut handling", async () => {
    const content = await Bun.file(join(ROOT, "skills", "tdd", "SKILL.md")).text();
    const lowerContent = content.toLowerCase();

    expectContainsAll(content, ["### RED", "### GREEN", "### REFACTOR", "## Example: Bug Fix Regression"]);
    expectContainsAll(lowerContent, [
      "minimal code",
      "test passes immediately",
      "manual testing",
      "when stuck",
      "delete means delete",
      "start over with tdd",
    ]);
  });

  test("receiving-code-review documents rigorous response handling", async () => {
    const content = await Bun.file(join(ROOT, "skills", "receiving-code-review", "SKILL.md")).text();
    const lowerContent = content.toLowerCase();

    expectContainsAll(content, ["## Source-Specific Handling", "## Handling Unclear Feedback", "## YAGNI Check", "## GitHub Thread Replies", "## Good And Bad Examples"]);
    expectContainsAll(lowerContent, [
      "external reviewer",
      "stop",
      "ask for clarification",
      "not as a top-level pr comment",
      "performative agreement",
      "technical reasoning",
    ]);
  });

  test("review-final is a distinct final holistic readiness review", async () => {
    const content = await Bun.file(join(ROOT, "skills", "review-final", "SKILL.md")).text();
    const lowerContent = content.toLowerCase();

    expect(content.includes("description: Use when")).toBe(true);
    expect(content.includes("```dot")).toBe(true);
    expect(content.includes("## Red Flags")).toBe(true);
    expectContainsAll(lowerContent, [
      "final holistic",
      "after task-level reviews",
      "before release/pr",
      "integrated diff",
      "verification evidence",
      "security",
      "qa",
      "documentation",
      "does not replace",
      "review-spec",
      "review-quality",
    ]);
    expect(content.includes("QA is the `@qa` agent")).toBe(true);
  });

  test("executing-plans requires isolation checks before non-trivial coding", async () => {
    const skill = await Bun.file(join(ROOT, "skills", "executing-plans", "SKILL.md")).text();
    const checklist = await Bun.file(join(ROOT, "skills", "executing-plans", "references", "execution-checklist.md")).text();
    const combined = `${skill}\n${checklist}`.toLowerCase();

    expectContainsAll(combined, [
      "worktree",
      "isolation",
      "non-trivial coding",
      "main/master",
      "unverified isolation",
    ]);
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
    expect(content.includes("--delete-branch")).toBe(true);
    expect(content.includes("--delete-remote")).toBe(true);
    expect(content.includes("optional remote deletion")).toBe(true);
    expect(content.includes("force removal")).toBe(true);
  });

  test("worktree ignore safety checks the chosen directory independently", async () => {
    const content = await Bun.file(join(ROOT, "skills", "worktree", "SKILL.md")).text();

    expect(content.includes("git check-ignore -q <chosen-worktree-dir>")).toBe(true);
    expect(content.includes("Each selected project-local root must be checked independently")).toBe(true);
    expect(content.includes("git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null")).toBe(false);
  });

  test("code quality reviewer prompt separates must-fix findings from advisory notes", async () => {
    const content = await Bun.file(join(ROOT, "skills", "subagent-driven-development", "code-quality-reviewer-prompt.md")).text();

    expect(content.includes("Must-fix findings:")).toBe(true);
    expect(content.includes("Advisory notes:")).toBe(true);
    expect(content.includes("Blocking issues:")).toBe(false);
    expect(content.includes("[Low]")).toBe(true);
  });

  test("worktree cleanup guide documents ordered merged cleanup", async () => {
    const content = await Bun.file(join(ROOT, "skills", "worktree", "cleanup-guide.md")).text();
    const lowerContent = content.toLowerCase();

    expectContainsAll(lowerContent, [
      "uncommitted changes",
      "--delete-branch",
      "--delete-remote",
      "optional remote",
      "cleanup order",
    ]);
    expect(content.includes("cleanup-merged --json")).toBe(true);
    expect(content.includes("cleanup-merged --apply")).toBe(true);
  });

  test("worktree and release docs mention cleanup-merged preview/apply flow", async () => {
    const worktree = await Bun.file(join(ROOT, "skills", "worktree", "SKILL.md")).text();
    const release = await Bun.file(join(ROOT, "skills", "release", "SKILL.md")).text();
    const finish = await Bun.file(join(ROOT, "skills", "finishing-a-development-branch", "SKILL.md")).text();
    const readme = await Bun.file(join(ROOT, "README.md")).text();

    expect(worktree.includes("cleanup-merged --json")).toBe(true);
    expect(worktree.includes("cleanup-merged --apply")).toBe(true);
    expect(release.includes("cleanup-merged --json")).toBe(true);
    expect(finish.includes("cleanup-merged --json")).toBe(true);
    expect(readme.includes("agentic worktree cleanup-merged --json")).toBe(true);
  });

  test("release workflow preserves fresh evidence before cleanup", async () => {
    const content = await Bun.file(join(ROOT, "skills", "release", "SKILL.md")).text();
    const workflow = content.slice(content.indexOf("## Workflow"), content.indexOf("## Required Steps"));
    const requiredSteps = content.slice(content.indexOf("## Required Steps"), content.indexOf("## Rules"));

    expectContainsAll(workflow, [
      "Run fresh verification",
      "Preserve release evidence",
      "Tag and publish release artifacts",
      "Post-release cleanup",
    ]);
    expectOrdered(workflow, "Run fresh verification", "Preserve release evidence");
    expectOrdered(workflow, "Preserve release evidence", "Tag and publish release artifacts");
    expectOrdered(workflow, "Tag and publish release artifacts", "Post-release cleanup");

    expectContainsAll(requiredSteps, [
      "run fresh verification",
      "preserve release evidence before cleanup",
      "post-release or follow-on work",
      "safe preflight only when already-merged worktrees are being cleaned separately",
    ]);
    expectOrdered(requiredSteps, "run fresh verification", "preserve release evidence before cleanup");
    expectOrdered(requiredSteps, "preserve release evidence before cleanup", "post-release or follow-on work");
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
    const usingAgentic = await Bun.file(join(ROOT, "skills", "using-agentic", "SKILL.md")).text();
    const sdd = await Bun.file(join(ROOT, "skills", "subagent-driven-development", "SKILL.md")).text();

    expect(release.includes("release readiness, versioning/changelog/tag/publish")).toBe(true);
    expect(release.includes("coordinate with `pr` only when packaging a delivery unit")).toBe(true);
    expect(release.includes("own commit + gh PR creation")).toBe(false);
    expect(release.includes("delivery units or grouped tasks")).toBe(true);
    expect(release.includes("check merged PRs")).toBe(true);
    expect(release.includes("optional remote branch")).toBe(true);
    expect(pr.includes("owns PR creation and the review-readiness body")).toBe(true);
    expect(usingAgentic.includes("| PR creation and review-readiness body | `pr` |")).toBe(true);
    expect(usingAgentic.includes("| Release readiness, versioning/changelog/tag/publish | `release` |")).toBe(true);
    expect(pr.includes("delivery unit")).toBe(true);
    expect(pr.includes("grouped tasks")).toBe(true);
    expect(sdd.includes("independent planned task groups")).toBe(true);
    expect(sdd.includes("shared groups stay together")).toBe(true);
  });

  test("finishing-a-development-branch documents merged cleanup handoff", async () => {
    const content = await Bun.file(join(ROOT, "skills", "finishing-a-development-branch", "SKILL.md")).text();
    const lowerContent = content.toLowerCase();

    expectContainsAll(lowerContent, [
      "already merged",
      "uncommitted changes",
      "delete the merged local branch",
      "remote branch only if explicitly requested",
    ]);
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
