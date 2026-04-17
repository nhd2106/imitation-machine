import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const ROOT = process.cwd();

async function exists(relativePath: string): Promise<boolean> {
  return Bun.file(join(ROOT, relativePath)).exists();
}

describe("skill packages", () => {
  test("brainstorm ships companion prompt and checklist assets", async () => {
    expect(await exists("skills/brainstorm/spec-document-reviewer-prompt.md")).toBe(true);
    expect(await exists("skills/brainstorm/references/brainstorm-checklist.md")).toBe(true);
  });

  test("subagent-driven-development ships prompt templates for all stages", async () => {
    expect(await exists("skills/subagent-driven-development/implementer-prompt.md")).toBe(true);
    expect(await exists("skills/subagent-driven-development/spec-reviewer-prompt.md")).toBe(true);
    expect(await exists("skills/subagent-driven-development/code-quality-reviewer-prompt.md")).toBe(true);
  });

  test("using-agentic ships reference docs", async () => {
    expect(await exists("skills/using-agentic/references/opencode-tools.md")).toBe(true);
    expect(await exists("skills/using-agentic/references/workflow-cheatsheet.md")).toBe(true);
  });

  test("tdd ships anti-pattern and checklist docs", async () => {
    expect(await exists("skills/tdd/testing-anti-patterns.md")).toBe(true);
    expect(await exists("skills/tdd/regression-checklist.md")).toBe(true);
  });

  test("review-security ships checklist and reporting helpers", async () => {
    expect(await exists("skills/review-security/references/security-review-checklist.md")).toBe(true);
    expect(await exists("skills/review-security/references/common-findings.md")).toBe(true);
    expect(await exists("skills/review-security/review-report-template.md")).toBe(true);
  });

  test("plan and verify ship review and triage helpers", async () => {
    expect(await exists("skills/plan/plan-document-reviewer-prompt.md")).toBe(true);
    expect(await exists("skills/plan/references/plan-checklist.md")).toBe(true);
    expect(await exists("skills/executing-plans/references/execution-checklist.md")).toBe(true);
    expect(await exists("skills/executing-plans/progress-update-template.md")).toBe(true);
    expect(await exists("skills/verify/references/verification-checklist.md")).toBe(true);
    expect(await exists("skills/verify/failure-triage.md")).toBe(true);
  });

  test("review skills ship companion checklists and templates", async () => {
    expect(await exists("skills/review-spec/references/spec-review-checklist.md")).toBe(true);
    expect(await exists("skills/review-spec/review-report-template.md")).toBe(true);
    expect(await exists("skills/review-quality/references/quality-review-checklist.md")).toBe(true);
    expect(await exists("skills/review-quality/review-severity-guide.md")).toBe(true);
  });

  test("delivery and governance skills ship helper assets", async () => {
    expect(await exists("skills/gate/references/gate-matrix.md")).toBe(true);
    expect(await exists("skills/gate/hook-installation.md")).toBe(true);
    expect(await exists("skills/pr/references/pr-checklist.md")).toBe(true);
    expect(await exists("skills/pr/pr-body-template.md")).toBe(true);
    expect(await exists("skills/release/references/semver-guide.md")).toBe(true);
    expect(await exists("skills/release/changelog-template.md")).toBe(true);
  });

  test("repo workflow skills ship checklists and templates", async () => {
    expect(await exists("skills/worktree/references/worktree-checklist.md")).toBe(true);
    expect(await exists("skills/worktree/cleanup-guide.md")).toBe(true);
    expect(await exists("skills/repo/references/monorepo-assumptions.md")).toBe(true);
    expect(await exists("skills/repo/impact-checklist.md")).toBe(true);
    expect(await exists("skills/adr/adr-template.md")).toBe(true);
    expect(await exists("skills/adr/references/decision-triggers.md")).toBe(true);
    expect(await exists("skills/commit/references/conventional-commit-guide.md")).toBe(true);
    expect(await exists("skills/commit/commit-message-template.md")).toBe(true);
  });

  test("superpowers-gap skill packages ship companion assets", async () => {
    expect(await exists("skills/systematic-debugging/references/debugging-checklist.md")).toBe(true);
    expect(await exists("skills/systematic-debugging/hypothesis-log-template.md")).toBe(true);
    expect(await exists("skills/dispatching-parallel-agents/references/parallel-safety-checklist.md")).toBe(true);
    expect(await exists("skills/dispatching-parallel-agents/dispatch-template.md")).toBe(true);
    expect(await exists("skills/finishing-a-development-branch/references/branch-finish-checklist.md")).toBe(true);
    expect(await exists("skills/finishing-a-development-branch/branch-hand-off-template.md")).toBe(true);
    expect(await exists("skills/receiving-code-review/references/review-response-checklist.md")).toBe(true);
    expect(await exists("skills/receiving-code-review/fix-summary-template.md")).toBe(true);
  });
});
