import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { access, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  evaluateExecutableWorkflowTranscript,
  formatExecutableWorkflowFailureContext,
  runExecutableWorkflowHarness,
  scaffoldExecutableWorkflowHarness,
} from "../scripts/executable-workflow-harness";

const cleanupDirs = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...cleanupDirs].map(async (dir) => {
      cleanupDirs.delete(dir);
      await rm(dir, { recursive: true, force: true });
    }),
  );
});

describe("executable workflow harness", () => {
  test("scaffolds a temporary Bun repo with an approved single-task plan", async () => {
    const scaffold = await scaffoldExecutableWorkflowHarness();
    cleanupDirs.add(scaffold.repoDir);

    expect(scaffold.files).toEqual({
      packageJson: join(scaffold.repoDir, "package.json"),
      plan: join(scaffold.repoDir, "plans", "PLN-PR29.md"),
      implementation: join(scaffold.repoDir, "src", "math.ts"),
      reviewSpec: join(scaffold.repoDir, "scripts", "review-spec.ts"),
      reviewQuality: join(scaffold.repoDir, "scripts", "review-quality.ts"),
      test: join(scaffold.repoDir, "tests", "math.test.ts"),
      transcript: join(scaffold.repoDir, "artifacts", "workflow-transcript.log"),
    });

    await expect(access(scaffold.files.packageJson)).resolves.toBeNull();
    await expect(access(scaffold.files.plan)).resolves.toBeNull();
    await expect(access(scaffold.files.implementation)).rejects.toThrow();
    await expect(access(scaffold.files.reviewSpec)).resolves.toBeNull();
    await expect(access(scaffold.files.reviewQuality)).resolves.toBeNull();
    await expect(access(scaffold.files.test)).resolves.toBeNull();
    await expect(access(scaffold.files.transcript)).resolves.toBeNull();

    const packageJson = JSON.parse(await readFile(scaffold.files.packageJson, "utf8"));
    const plan = await readFile(scaffold.files.plan, "utf8");
    const testFile = await readFile(scaffold.files.test, "utf8");

    expect(packageJson).toMatchObject({
      packageManager: expect.stringContaining("bun@"),
      scripts: { test: "bun test" },
    });
    expect(plan).toContain("Status: approved");
    expect(plan).toContain("Task count: 1");
    expect(testFile).toContain('from "bun:test"');
  });

  test("supports reusable plan/task ids and sample filenames", async () => {
    const scaffold = await scaffoldExecutableWorkflowHarness({
      planId: "PLN-42",
      taskId: "TSK-42-7",
      sample: {
        implementationFile: "src/sum.ts",
        testFile: "tests/sum.test.ts",
        reviewSpecFile: "scripts/check-spec.ts",
        reviewQualityFile: "scripts/check-quality.ts",
        transcriptFile: "artifacts/sum-transcript.log",
      },
    });
    cleanupDirs.add(scaffold.repoDir);

    expect(scaffold.files.plan).toBe(join(scaffold.repoDir, "plans", "PLN-42.md"));
    expect(scaffold.files.reviewSpec).toBe(join(scaffold.repoDir, "scripts", "check-spec.ts"));
    expect(scaffold.files.reviewQuality).toBe(join(scaffold.repoDir, "scripts", "check-quality.ts"));
    expect(scaffold.files.implementation).toBe(join(scaffold.repoDir, "src", "sum.ts"));
    expect(scaffold.files.test).toBe(join(scaffold.repoDir, "tests", "sum.test.ts"));
    expect(scaffold.files.transcript).toBe(join(scaffold.repoDir, "artifacts", "sum-transcript.log"));

    const plan = await readFile(scaffold.files.plan, "utf8");
    const reviewSpec = await readFile(scaffold.files.reviewSpec, "utf8");
    const reviewQuality = await readFile(scaffold.files.reviewQuality, "utf8");
    const testFile = await readFile(scaffold.files.test, "utf8");

    expect(plan).toContain("# PLN-42");
    expect(plan).toContain("## Task TSK-42-7");
    expect(reviewSpec).toContain('join(repoDir, "plans", "PLN-42.md")');
    expect(reviewSpec).toContain('join(repoDir, "tests", "sum.test.ts")');
    expect(reviewQuality).toContain('join(repoDir, "src", "sum.ts")');
    expect(reviewQuality).toContain('join(repoDir, "tests", "sum.test.ts")');
    expect(testFile).toContain('from "../src/sum"');
  });

  test("sanitizes kebab-case sample basenames into valid TypeScript identifiers", async () => {
    const scaffold = await scaffoldExecutableWorkflowHarness({
      sample: {
        implementationFile: "src/http-client.ts",
        testFile: "tests/http-client.test.ts",
      },
    });
    cleanupDirs.add(scaffold.repoDir);

    const testFile = await readFile(scaffold.files.test, "utf8");

    expect(testFile).toContain('import { httpClientValues } from "../src/http-client"');

    const result = await runExecutableWorkflowHarness({
      sample: {
        implementationFile: "src/http-client.ts",
        testFile: "tests/http-client.test.ts",
      },
    });
    cleanupDirs.add(result.repoDir);

    const implementationFile = await readFile(result.files.implementation, "utf8");

    expect(implementationFile).toContain("export function httpClientValues");
    expect(result.verification.exitCode).toBe(0);
    expect(result.validation.valid).toBe(true);
  });

  test("uses a dot-relative import when implementation and test share a directory", async () => {
    const scaffold = await scaffoldExecutableWorkflowHarness({
      sample: {
        implementationFile: "src/math.ts",
        testFile: "src/math.test.ts",
      },
    });
    cleanupDirs.add(scaffold.repoDir);

    const testFile = await readFile(scaffold.files.test, "utf8");

    expect(testFile).toContain('from "./math"');
  });

  test("runs the reusable workflow harness end to end", async () => {
    const result = await runExecutableWorkflowHarness();
    cleanupDirs.add(result.repoDir);

    const reviewSpecDigest = createHash("sha256").update(result.reviewSpec.stdout).digest("hex");
    const reviewQualityDigest = createHash("sha256")
      .update(result.reviewQuality.stdout)
      .digest("hex");
    const verificationDigest = createHash("sha256")
      .update(result.verification.stdout)
      .digest("hex");
    const reviewSpecReport = JSON.parse(result.reviewSpec.stdout) as {
      planFile: string;
      testFile: string;
    };
    const reviewQualityReport = JSON.parse(result.reviewQuality.stdout) as {
      implementationFile: string;
      testFile: string;
    };

    expect(result.failingTest.exitCode).not.toBe(0);
    expect(result.reviewSpec.exitCode).toBe(0);
    expect(result.reviewQuality.exitCode).toBe(0);
    expect(result.verification.exitCode).toBe(0);
    expect(result.validation.valid).toBe(true);
    expect(result.validation.stages).toEqual([
      "repo-scaffolded",
      "plan-approved",
      "failing-test-observed",
      "implementation-written",
      "review-spec-passed",
      "review-quality-passed",
      "verification-fresh",
    ]);
    expect(result.createdFiles).toEqual(
      expect.arrayContaining([
        join(result.repoDir, "src", "math.ts"),
        join(result.repoDir, "scripts", "review-spec.ts"),
        join(result.repoDir, "scripts", "review-quality.ts"),
        join(result.repoDir, "tests", "math.test.ts"),
        join(result.repoDir, "plans", "PLN-PR29.md"),
        join(result.repoDir, "artifacts", "workflow-transcript.log"),
      ]),
    );
    expect(reviewSpecReport.planFile).toEndWith(join("plans", "PLN-PR29.md"));
    expect(reviewSpecReport.testFile).toEndWith(join("tests", "math.test.ts"));
    expect(reviewQualityReport.implementationFile).toEndWith(join("src", "math.ts"));
    expect(reviewQualityReport.testFile).toEndWith(join("tests", "math.test.ts"));
    expect(result.transcript).toContain(
      `[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=${reviewSpecDigest}`,
    );
    expect(result.transcript).toContain(
      `[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=${reviewQualityDigest}`,
    );
    expect(result.transcript).toContain(
      `[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=${verificationDigest}`,
    );
    expect(result.transcript).not.toContain("[review-spec] status: PASS");
    expect(result.transcript).not.toContain("[review-quality] status: PASS");

    const transcriptFile = await readFile(result.files.transcript, "utf8");
    expect(transcriptFile).toBe(result.transcript);
  });

  test("runs the review-spec failure recovery variant end to end", async () => {
    const result = await runExecutableWorkflowHarness({
      variant: "review-spec-recovery",
    });
    cleanupDirs.add(result.repoDir);

    const reviewSpecLines = result.transcript
      .trim()
      .split("\n")
      .filter((line) => line.startsWith("[review-spec]"));
    const verifyLine = result.transcript
      .trim()
      .split("\n")
      .find((line) => line.startsWith("[verify] evidence source=current-run"));

    expect(result.failingTest.exitCode).not.toBe(0);
    expect(result.reviewSpec.exitCode).toBe(0);
    expect(result.reviewQuality.exitCode).toBe(0);
    expect(result.verification.exitCode).toBe(0);
    expect(result.validation.valid).toBe(true);
    expect(reviewSpecLines).toHaveLength(2);
    expect(reviewSpecLines[0]).toContain("exit=1");
    expect(reviewSpecLines[1]).toContain("exit=0");
    expect(result.transcript).toContain("[fix] applied review-spec-recovery");
    expect(result.transcript.indexOf(reviewSpecLines[0]!)).toBeLessThan(
      result.transcript.indexOf("[fix] applied review-spec-recovery"),
    );
    expect(result.transcript.indexOf("[fix] applied review-spec-recovery")).toBeLessThan(
      result.transcript.indexOf(reviewSpecLines[1]!),
    );
    expect(result.transcript.indexOf(reviewSpecLines[1]!)).toBeLessThan(
      result.transcript.indexOf("[review-quality]"),
    );
    expect(verifyLine).toBeDefined();
  });

  test("accepts transcript ordering for review-spec recovery evidence", () => {
    const validation = evaluateExecutableWorkflowTranscript(`
[state] repo-scaffolded
[plan] status: approved
[tdd] failing test observed command=bun test exit=1
[impl] wrote src/math.ts
[review-spec] command=bun scripts/review-spec.ts exit=1 evidence-sha256=spec-fail
[fix] applied review-spec-recovery
[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec-pass
[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality
[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify
`);

    expect(validation.valid).toBe(true);
    expect(validation.stages).toEqual([
      "repo-scaffolded",
      "plan-approved",
      "failing-test-observed",
      "implementation-written",
      "review-spec-passed",
      "review-quality-passed",
      "verification-fresh",
    ]);
  });

  test("rejects out-of-order transcript stages", () => {
    const validation = evaluateExecutableWorkflowTranscript(`
[state] repo-scaffolded
[plan] status: approved
[tdd] failing test observed command=bun test exit=1
[impl] wrote src/math.ts
[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality
[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec
[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify
`);

    expect(validation.valid).toBe(false);
    expect(validation.issues).toContain(
      "Out-of-order progression: repo-scaffolded -> plan-approved -> failing-test-observed -> implementation-written -> review-spec-passed -> review-quality-passed -> verification-fresh",
    );
    expect(validation.issues).toContain(
      "Review sequence violated: review-spec must precede review-quality",
    );
  });

  test("rejects review-quality before review-spec", () => {
    const validation = evaluateExecutableWorkflowTranscript(`
[state] repo-scaffolded
[plan] status: approved
[tdd] failing test observed command=bun test exit=1
[impl] wrote src/math.ts
[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality
[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec
[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify
`);

    expect(validation.valid).toBe(false);
    expect(validation.issues).toContain(
      "Review sequence violated: review-spec must precede review-quality",
    );
  });

  test("rejects stale verification evidence", () => {
    const validation = evaluateExecutableWorkflowTranscript(`
[state] repo-scaffolded
[plan] status: approved
[tdd] failing test observed command=bun test exit=1
[impl] wrote src/math.ts
[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec
[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality
[verify] evidence source=previous-run command=bun test exit=0 stdout-sha256=verify
`);

    expect(validation.valid).toBe(false);
    expect(validation.issues).toContain(
      "Stale verification evidence: [verify] evidence source=previous-run command=bun test exit=0 stdout-sha256=verify",
    );
  });

  test("rejects failing-test stage when bun test did not fail", () => {
    const validation = evaluateExecutableWorkflowTranscript(`
[state] repo-scaffolded
[plan] status: approved
[tdd] failing test observed command=bun test exit=0
[impl] wrote src/math.ts
[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec
[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality
[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify
`);

    expect(validation.valid).toBe(false);
    expect(validation.issues).toContain(
      "Failing-test stage violated: bun test must exit non-zero before implementation",
    );
  });

  test("formats actionable failure context for failed review and verification commands", () => {
    const lines = formatExecutableWorkflowFailureContext({
      validation: {
        valid: false,
        stages: ["repo-scaffolded", "plan-approved"],
        issues: ["Missing transcript marker for stage: review-spec-passed"],
      },
      failingTest: {
        exitCode: 0,
        stdout: "",
        stderr: "",
      },
      reviewSpec: {
        exitCode: 1,
        stdout: '{"approvedPlan":false}',
        stderr: "Expected approved plan marker",
      },
      reviewQuality: {
        exitCode: 0,
        stdout: "",
        stderr: "",
      },
      verification: {
        exitCode: 1,
        stdout: "2 tests run\n1 failed",
        stderr: "error: Cannot find module '../src/math'",
      },
    });

    expect(lines).toEqual([
      "[executable-workflow] issue=Missing transcript marker for stage: review-spec-passed",
      "[executable-workflow] review-spec exit=1",
      '[executable-workflow] review-spec stderr="Expected approved plan marker"',
      '[executable-workflow] review-spec stdout="{\\\"approvedPlan\\\":false}"',
      "[executable-workflow] verification exit=1",
      '[executable-workflow] verification stderr="error: Cannot find module \'../src/math\'"',
      '[executable-workflow] verification stdout="2 tests run\\n1 failed"',
    ]);
  });

  test("summarizes missing command output when verification fails without stdout or stderr", () => {
    const lines = formatExecutableWorkflowFailureContext({
      validation: {
        valid: true,
        stages: ["verification-fresh"],
        issues: [],
      },
      failingTest: {
        exitCode: 0,
        stdout: "",
        stderr: "",
      },
      reviewSpec: {
        exitCode: 0,
        stdout: "",
        stderr: "",
      },
      reviewQuality: {
        exitCode: 0,
        stdout: "",
        stderr: "",
      },
      verification: {
        exitCode: 1,
        stdout: "",
        stderr: "",
      },
    });

    expect(lines).toEqual([
      "[executable-workflow] verification exit=1",
      "[executable-workflow] verification reason=no stdout or stderr captured",
    ]);
  });

  test("includes initial failing-test command context when the TDD step fails for the wrong reason", () => {
    const lines = formatExecutableWorkflowFailureContext({
      validation: {
        valid: false,
        stages: ["repo-scaffolded", "plan-approved"],
        issues: [
          "Missing transcript marker for stage: failing-test-observed",
          "Failing-test stage violated: bun test must exit non-zero before implementation",
        ],
      },
      failingTest: {
        exitCode: 1,
        stdout: "bun test v1.3.8\n0 pass\n1 fail",
        stderr: "error: Cannot find module '../src/http-client'",
      },
      reviewSpec: {
        exitCode: 0,
        stdout: "",
        stderr: "",
      },
      reviewQuality: {
        exitCode: 0,
        stdout: "",
        stderr: "",
      },
      verification: {
        exitCode: 0,
        stdout: "",
        stderr: "",
      },
    });

    expect(lines).toEqual([
      "[executable-workflow] issue=Missing transcript marker for stage: failing-test-observed",
      "[executable-workflow] issue=Failing-test stage violated: bun test must exit non-zero before implementation",
      "[executable-workflow] failing-test exit=1",
      "[executable-workflow] failing-test context=initial bun test failed for the wrong reason",
      '[executable-workflow] failing-test stderr="error: Cannot find module \'../src/http-client\'"',
      '[executable-workflow] failing-test stdout="bun test v1.3.8\\n0 pass\\n1 fail"',
    ]);
  });
});
