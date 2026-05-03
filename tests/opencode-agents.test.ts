import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import ImitationMachinePlugin from "../.opencode/plugins/imitation-machine.js";

const ROOT = join(import.meta.dir, "..");

async function readAgent(name: string): Promise<string> {
  return Bun.file(join(ROOT, ".opencode", "agents", `${name}.md`)).text();
}

function extractFrontmatterDescription(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return "";
  const frontmatter = match[1] ?? "";
  for (const line of frontmatter.split("\n")) {
    if (line.startsWith("description:")) {
      return line.slice("description:".length).trim();
    }
  }
  return "";
}

function expectOrdered(content: string, earlier: string, later: string): void {
  const earlierIndex = content.indexOf(earlier);
  const laterIndex = content.indexOf(later);

  expect(earlierIndex, `${earlier} should exist`).toBeGreaterThanOrEqual(0);
  expect(laterIndex, `${later} should exist`).toBeGreaterThanOrEqual(0);
  expect(earlierIndex, `${earlier} should appear before ${later}`).toBeLessThan(laterIndex);
}

describe("OpenCode agents", () => {
  test("core persona agents exist as subagents", async () => {
    for (const agent of ["architect", "po", "planner", "worktree", "coder", "qa", "security", "reviewer-spec", "reviewer-quality", "reviewer-final", "docs", "release"] as const) {
      const content = await readAgent(agent);
      expect(content.includes("mode: subagent")).toBe(true);
      expect(content.includes("description:")).toBe(true);
    }
  });

  test("plugin-backed agent descriptions stay in sync with checked-in frontmatter", async () => {
    const plugin = await ImitationMachinePlugin();
    const config: {
      agent?: Record<string, { description?: string }>;
      skills?: { paths?: string[] };
    } = {};

    await plugin.config(config);

    for (const agent of ["architect", "po", "planner", "worktree", "coder", "qa", "security", "reviewer-spec", "reviewer-quality", "reviewer-final", "docs", "release"] as const) {
      const content = await readAgent(agent);
      const description = extractFrontmatterDescription(content);
      expect(description.length).toBeGreaterThan(0);
      expect(config.agent?.[agent]?.description).toBe(description);
    }
  });

  test("project build agent requires delegation and worktree gating", async () => {
    const content = await readAgent("build");
    expect(content.includes("mode: primary")).toBe(true);
    expect(content.includes("task:")).toBe(true);
    expect(content.includes("delegation is mandatory")).toBe(true);
    expect(content.includes("Spawn child sessions using the persona subagents")).toBe(true);
    expect(content.includes("Do not code inline until this decision is resolved.")).toBe(true);
    expect(content.includes("## Parallelism Rule")).toBe(true);
    expect(content.includes("@worktree")).toBe(true);
    expect(content.includes("systematic-debugging")).toBe(true);
    expect(content.includes("dispatching-parallel-agents")).toBe(true);
    expect(content.includes("executing-plans")).toBe(true);
    expect(content.includes("finishing-a-development-branch")).toBe(true);
    expect(content.includes("requesting-code-review")).toBe(true);
    expect(content.includes("receiving-code-review")).toBe(true);
  });

  test("project build agent runs specialized checks and fresh verification before final review", async () => {
    const content = await readAgent("build");
    const preferredSequence = content.slice(content.indexOf("## Preferred Sequence"));

    expect(preferredSequence).toContain("task-level reviews");
    expect(preferredSequence).toContain("@security");
    expect(preferredSequence).toContain("@qa");
    expect(preferredSequence).toContain("@docs");
    expect(preferredSequence).toContain("agentic verify all");
    expect(preferredSequence).toContain("@reviewer-final");
    expect(preferredSequence).toContain("PR/release/handoff");
    expectOrdered(preferredSequence, "task-level reviews", "agentic verify all");
    for (const specializedCheck of ["@security", "@qa", "@docs"] as const) {
      expectOrdered(preferredSequence, specializedCheck, "agentic verify all");
      expectOrdered(preferredSequence, specializedCheck, "@reviewer-final");
    }
    expectOrdered(preferredSequence, "agentic verify all", "@reviewer-final");
    expectOrdered(preferredSequence, "@reviewer-final", "PR/release/handoff");
  });

  test("coder can edit while reviewers are read-only", async () => {
    const coder = await readAgent("coder");
    const reviewerSpec = await readAgent("reviewer-spec");
    const reviewerQuality = await readAgent("reviewer-quality");
    const reviewerFinal = await readAgent("reviewer-final");
    const security = await readAgent("security");
    const qa = await readAgent("qa");
    const docs = await readAgent("docs");
    const release = await readAgent("release");

    expect(coder.includes("edit: allow")).toBe(true);
    expect(reviewerSpec.includes("edit: deny")).toBe(true);
    expect(reviewerQuality.includes("edit: deny")).toBe(true);
    expect(reviewerFinal.includes("edit: deny")).toBe(true);
    expect(security.includes("edit: deny")).toBe(true);
    expect(qa.includes("edit: deny")).toBe(true);
    expect(docs.includes("edit: allow")).toBe(true);
    expect(release.includes("edit: ask")).toBe(true);
  });

  test("reviewer-quality reports scoped Stage 2 quality gate readiness", async () => {
    const reviewerQuality = await readAgent("reviewer-quality");

    expect(reviewerQuality).toContain("Quality gate: Pass | Fail | Pass with advisory notes");
    expect(reviewerQuality).not.toMatch(/Ready to merge/i);
  });

  test("reviewer-final owns final holistic readiness without replacing earlier gates", async () => {
    const reviewerFinal = await readAgent("reviewer-final");

    expect(reviewerFinal).toContain("Final readiness: Pass | Fail | Pass with concerns");
    expect(reviewerFinal).toContain("after task-level spec and quality reviews");
    expect(reviewerFinal).toContain("integrated diff");
    expect(reviewerFinal).toContain("does not replace @reviewer-spec or @reviewer-quality");
  });

  test("planner and po stay non-implementation focused", async () => {
    const planner = await readAgent("planner");
    const po = await readAgent("po");

    expect(planner.includes("exact file paths")).toBe(true);
    expect(planner.includes("verification command")).toBe(true);
    expect(planner.includes("@worktree")).toBe(true);
    expect(planner.includes("independence / grouping")).toBe(true);
    expect(planner.includes("fan out to multiple branches/worktrees/coders in parallel")).toBe(true);
    expect(po.includes("acceptance criteria")).toBe(true);
    expect(po.includes("do not start planning or coding")).toBe(true);
  });

  test("subagent-driven-development references real OpenCode subagents", async () => {
    const content = await Bun.file(join(ROOT, "skills", "subagent-driven-development", "SKILL.md")).text();
    expect(content.includes("@coder")).toBe(true);
    expect(content.includes("@reviewer-spec")).toBe(true);
    expect(content.includes("@reviewer-quality")).toBe(true);
    expect(content.includes("@reviewer-final")).toBe(true);
    expect(content.includes("@po")).toBe(true);
    expect(content.includes("@planner")).toBe(true);
    expect(content.includes("@worktree")).toBe(true);
    expect(content.includes("@architect")).toBe(true);
    expect(content.includes("@security")).toBe(true);
    expect(content.includes("@qa")).toBe(true);
    expect(content.includes("@docs")).toBe(true);
    expect(content.includes("@release")).toBe(true);
  });

  test("skill docs reference the corresponding runtime agents", async () => {
    const checks: Array<[string, string]> = [
      ["skills/plan/SKILL.md", "@planner"],
      ["skills/executing-plans/SKILL.md", "@coder"],
      ["skills/worktree/SKILL.md", "@worktree"],
      ["skills/brainstorm/SKILL.md", "@po"],
      ["skills/adr/SKILL.md", "@architect"],
      ["skills/review-spec/SKILL.md", "@reviewer-spec"],
      ["skills/review-quality/SKILL.md", "@reviewer-quality"],
      ["skills/review-final/SKILL.md", "@reviewer-final"],
      ["skills/review-security/SKILL.md", "@security"],
      ["skills/pr/SKILL.md", "@release"],
      ["skills/release/SKILL.md", "@release"],
      ["skills/verify/SKILL.md", "@release"],
    ];

    for (const [relativePath, agent] of checks) {
      const content = await Bun.file(join(ROOT, relativePath)).text();
      expect(content.includes(agent)).toBe(true);
    }
  });

  test("worktree agent stays isolated from coding responsibilities", async () => {
    const content = await readAgent("worktree");
    expect(content.includes("do not implement product code")).toBe(true);
    expect(content.includes("git worktree *")).toBe(true);
    expect(content.includes("ALREADY_ISOLATED")).toBe(true);
    expect(content.includes("multiple worktrees")).toBe(true);
    expect(content.includes("clean stale local branches/worktrees safely")).toBe(true);
  });

  test("build and release agents route PR creation to pr skill", async () => {
    const build = await readAgent("build");
    const content = await readAgent("release");

    expect(build.includes("`pr` skill owns PR creation/review-readiness body")).toBe(true);
    expect(build.includes("`release` owns release readiness, versioning/changelog/tag/publish")).toBe(true);
    expect(build.includes("@release` owns commit + gh PR creation")).toBe(false);

    expect(content.includes("coordinate with `pr` for PR creation/review-readiness body")).toBe(true);
    expect(content.includes("commit + gh PR creation")).toBe(false);
    expect(content.includes("delivery units or grouped tasks")).toBe(true);
    expect(content.includes("check merged PRs")).toBe(true);
    expect(content.includes("clean stale local branches/worktrees safely")).toBe(true);
  });
});
