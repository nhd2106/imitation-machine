import { afterEach, describe, expect, test } from "bun:test";
import { access, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  evaluateClaudeExecutableTranscript,
  runClaudeExecutableHarness,
  scaffoldClaudeExecutableHarness,
} from "../scripts/claude-code-harness";

const cleanupDirs = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...cleanupDirs].map(async (dir) => {
      cleanupDirs.delete(dir);
      await rm(dir, { recursive: true, force: true });
    }),
  );
});

describe("Claude executable harness", () => {
  test("scaffolds a bounded temp repo for the Claude review lane", async () => {
    const scaffold = await scaffoldClaudeExecutableHarness();
    cleanupDirs.add(scaffold.repoDir);

    expect(scaffold.files).toEqual({
      packageJson: join(scaffold.repoDir, "package.json"),
      prompt: join(scaffold.repoDir, "prompts", "claude-review-request.txt"),
      plan: join(scaffold.repoDir, "plans", "PLN-PR31.md"),
      implementation: join(scaffold.repoDir, "src", "sum.ts"),
      reviewSpec: join(scaffold.repoDir, "scripts", "review-spec.ts"),
      reviewQuality: join(scaffold.repoDir, "scripts", "review-quality.ts"),
      test: join(scaffold.repoDir, "tests", "sum.test.ts"),
      transcript: join(scaffold.repoDir, "artifacts", "claude-transcript.log"),
    });

    await expect(access(scaffold.files.packageJson)).resolves.toBeNull();
    await expect(access(scaffold.files.prompt)).resolves.toBeNull();
    await expect(access(scaffold.files.plan)).resolves.toBeNull();
    await expect(access(scaffold.files.implementation)).rejects.toThrow();
    await expect(access(scaffold.files.reviewSpec)).resolves.toBeNull();
    await expect(access(scaffold.files.reviewQuality)).resolves.toBeNull();
    await expect(access(scaffold.files.test)).resolves.toBeNull();
    await expect(access(scaffold.files.transcript)).resolves.toBeNull();

    expect(await readFile(scaffold.files.prompt, "utf8")).toContain("review-spec before review-quality");
    expect(await readFile(scaffold.files.plan, "utf8")).toContain("Status: approved");
    expect(await readFile(scaffold.files.test, "utf8")).toContain('from "bun:test"');
  });

  test("runs the bounded Claude executable lane end to end", async () => {
    const result = await runClaudeExecutableHarness();
    cleanupDirs.add(result.repoDir);

    expect(result.workflowRun.repoDir).toBe(result.repoDir);
    expect(result.workflowRun.files).toEqual({
      packageJson: result.files.packageJson,
      prompt: result.files.prompt,
      plan: result.files.plan,
      implementation: result.files.implementation,
      reviewSpec: result.files.reviewSpec,
      reviewQuality: result.files.reviewQuality,
      test: result.files.test,
      transcript: result.files.transcript,
    });
    expect(result.failingTest.exitCode).not.toBe(0);
    expect(result.reviewSpec.exitCode).toBe(0);
    expect(result.reviewQuality.exitCode).toBe(0);
    expect(result.verification.exitCode).toBe(0);
    expect(result.validation.valid).toBe(true);
    expect(result.workflowRun.validation.valid).toBe(true);
    expect(result.validation.stages).toEqual([
      "install-visible-skills",
      "workflow-routing",
      "review-spec-passed",
      "review-quality-passed",
      "verification-fresh",
      "review-ready",
    ]);
    expect(result.createdFiles).toEqual(
      expect.arrayContaining([
        join(result.repoDir, "prompts", "claude-review-request.txt"),
        join(result.repoDir, "plans", "PLN-PR31.md"),
        join(result.repoDir, "src", "sum.ts"),
        join(result.repoDir, "scripts", "review-spec.ts"),
        join(result.repoDir, "scripts", "review-quality.ts"),
        join(result.repoDir, "tests", "sum.test.ts"),
        join(result.repoDir, "artifacts", "claude-transcript.log"),
      ]),
    );
    expect(result.transcript.indexOf("[review-spec] command=bun scripts/review-spec.ts exit=0")).toBeLessThan(
      result.transcript.indexOf("[review-quality] command=bun scripts/review-quality.ts exit=0"),
    );
    expect(result.transcript).toContain(`[prompt] file: ${result.files.prompt}`);
    expect(result.transcript).toContain("[prompt] consumed-by=review-spec");
    expect(result.transcript).toContain("[prompt] consumed-by=review-quality");
    expect(result.transcript).toContain("[verify] evidence source=current-run command=bun test exit=0");
    expect(result.transcript).toContain(result.workflowRun.transcript.trim());
    expect(result.workflowRun.transcript).toContain("[state] repo-scaffolded");
    expect(result.workflowRun.transcript).toContain("[plan] status: approved");
    expect(result.workflowRun.transcript).toContain(`[prompt] scaffolded ${result.files.prompt}`);
    expect(result.workflowRun.transcript).toContain("[prompt] consumed-by=review-spec");
    expect(result.workflowRun.transcript).toContain("[prompt] consumed-by=review-quality");
    expect(result.workflowRun.transcript).toContain(
      `[review-spec] command=bun scripts/review-spec.ts exit=${result.reviewSpec.exitCode}`,
    );
    expect(await readFile(result.files.transcript, "utf8")).toBe(result.transcript);
  });

  test("rejects transcripts that skip fresh verification or reverse review order", () => {
    const result = evaluateClaudeExecutableTranscript(`
[install] plugin imitation-machine@imitation-machine-dev installed
[skills] visible: using-agentic, requesting-code-review, review-spec, review-quality
[route] workflow: requesting-code-review
[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality
[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec
[state] review-ready
`);

    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Review sequence violated: review-spec must precede review-quality");
    expect(result.issues).toContain("Missing fresh verification evidence");
  });
});
