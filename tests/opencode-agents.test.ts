import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");

async function readAgent(name: string): Promise<string> {
  return Bun.file(join(ROOT, ".opencode", "agents", `${name}.md`)).text();
}

describe("OpenCode agents", () => {
  test("core persona agents exist as subagents", async () => {
    for (const agent of ["architect", "po", "planner", "worktree", "coder", "qa", "security", "reviewer-spec", "reviewer-quality", "docs", "release"] as const) {
      const content = await readAgent(agent);
      expect(content.includes("mode: subagent")).toBe(true);
      expect(content.includes("description:")).toBe(true);
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
    expect(content.includes("finishing-a-development-branch")).toBe(true);
    expect(content.includes("receiving-code-review")).toBe(true);
  });

  test("coder can edit while reviewers are read-only", async () => {
    const coder = await readAgent("coder");
    const reviewerSpec = await readAgent("reviewer-spec");
    const reviewerQuality = await readAgent("reviewer-quality");
    const security = await readAgent("security");
    const qa = await readAgent("qa");
    const docs = await readAgent("docs");
    const release = await readAgent("release");

    expect(coder.includes("edit: allow")).toBe(true);
    expect(reviewerSpec.includes("edit: deny")).toBe(true);
    expect(reviewerQuality.includes("edit: deny")).toBe(true);
    expect(security.includes("edit: deny")).toBe(true);
    expect(qa.includes("edit: deny")).toBe(true);
    expect(docs.includes("edit: allow")).toBe(true);
    expect(release.includes("edit: ask")).toBe(true);
  });

  test("planner and po stay non-implementation focused", async () => {
    const planner = await readAgent("planner");
    const po = await readAgent("po");

    expect(planner.includes("exact file paths")).toBe(true);
    expect(planner.includes("verification command")).toBe(true);
    expect(planner.includes("@worktree")).toBe(true);
    expect(po.includes("acceptance criteria")).toBe(true);
    expect(po.includes("do not start planning or coding")).toBe(true);
  });

  test("subagent-driven-development references real OpenCode subagents", async () => {
    const content = await Bun.file(join(ROOT, "skills", "subagent-driven-development", "SKILL.md")).text();
    expect(content.includes("@coder")).toBe(true);
    expect(content.includes("@reviewer-spec")).toBe(true);
    expect(content.includes("@reviewer-quality")).toBe(true);
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
      ["skills/worktree/SKILL.md", "@worktree"],
      ["skills/brainstorm/SKILL.md", "@po"],
      ["skills/adr/SKILL.md", "@architect"],
      ["skills/review-spec/SKILL.md", "@reviewer-spec"],
      ["skills/review-quality/SKILL.md", "@reviewer-quality"],
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
  });
});
