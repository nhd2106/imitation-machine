import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const ROOT = process.cwd();

const CORE_SKILLS = [
  "using-agentic",
  "brainstorm",
  "plan",
  "verify",
  "subagent-driven-development",
  "tdd",
  "review-security",
  "design",
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
    for (const skill of ["using-agentic", "brainstorm", "plan", "verify", "subagent-driven-development"] as const) {
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
  });

  test("tdd includes examples and stronger iron law wording", async () => {
    const content = await Bun.file(join(ROOT, "skills", "tdd", "SKILL.md")).text();
    expect(content.includes("Good And Bad Tests")).toBe(true);
    expect(content.includes("Write code before the test? Delete it. Start over.")).toBe(true);
  });

  test("verify includes a claim matrix and stronger proof guidance", async () => {
    const content = await Bun.file(join(ROOT, "skills", "verify", "SKILL.md")).text();
    expect(content.includes("## Claim Matrix")).toBe(true);
    expect(content.includes("Not sufficient")).toBe(true);
    expect(content.includes("Confidence is not evidence")).toBe(true);
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
  });

  test("rewritten discipline skills include workflow and red flags", async () => {
    for (const skill of ["tdd", "review-security", "design"] as const) {
      const content = await Bun.file(join(ROOT, "skills", skill, "SKILL.md")).text();
      expect(content.includes("```dot")).toBe(true);
      expect(content.includes("## Red Flags")).toBe(true);
      expect(content.includes("description: Use when")).toBe(true);
    }
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
});
