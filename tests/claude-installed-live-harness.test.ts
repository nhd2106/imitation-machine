import { afterEach, describe, expect, test } from "bun:test";
import { access, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  buildClaudeInstalledLiveHarnessCommand,
  evaluateClaudeInstalledLiveTranscript,
  loadClaudeInstalledLiveScenarioManifest,
  runClaudeInstalledLiveHarness,
  scaffoldClaudeInstalledLiveHarnessScenario,
  type ClaudeInstalledLiveHarnessCommand,
} from "../scripts/claude-installed-live-harness";

const manifestPath = new URL("./claude-code/installed-live-scenarios.json", import.meta.url).pathname;
const cleanupDirs = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...cleanupDirs].map(async (dir) => {
      cleanupDirs.delete(dir);
      await rm(dir, { recursive: true, force: true });
    }),
  );
});

describe("Claude installed live harness", () => {
  test("loads the checked-in installed Claude scenario manifest", async () => {
    const manifest = await loadClaudeInstalledLiveScenarioManifest(manifestPath);

    expect(manifest.scenarios.map((scenario) => scenario.id)).toEqual([
      "installed-docs-review-happy-path",
    ]);
  });

  test("builds direct Claude argv for installed single-session runs", () => {
    expect(buildClaudeInstalledLiveHarnessCommand({ prompt: "run it" })).toEqual({
      executable: "claude",
      args: ["--print", "run it"],
    });
  });

  test("skips cleanly when installed live mode env is disabled", async () => {
    let executed = false;

    const result = await runClaudeInstalledLiveHarness({
      manifestPath,
      env: {},
      exec: async () => {
        executed = true;
        return { stdout: "", stderr: "", exitCode: 0 };
      },
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("CLAUDE_INSTALLED_LIVE=1");
    expect(result.summary).toEqual({ total: 1, passed: 0, failed: 0 });
    expect(executed).toBe(false);
  });

  test("scaffolds the installed docs-review temp repo from the executable harness", async () => {
    const manifest = await loadClaudeInstalledLiveScenarioManifest(manifestPath);
    const scenario = manifest.scenarios[0]!;
    const scaffold = await scaffoldClaudeInstalledLiveHarnessScenario(scenario);
    cleanupDirs.add(scaffold.repoDir);

    expect(scaffold.files).toEqual({
      packageJson: join(scaffold.repoDir, "package.json"),
      prompt: join(scaffold.repoDir, "prompts", "claude-installed-live.txt"),
      plan: join(scaffold.repoDir, "plans", "PLN-PR37.md"),
      implementation: join(scaffold.repoDir, "src", "docs", "review.ts"),
      reviewSpec: join(scaffold.repoDir, "scripts", "review-spec.ts"),
      reviewQuality: join(scaffold.repoDir, "scripts", "review-quality.ts"),
      test: join(scaffold.repoDir, "tests", "docs", "review.test.ts"),
      transcript: join(scaffold.repoDir, "artifacts", "claude-installed-live.log"),
    });

    await expect(access(scaffold.files.packageJson)).resolves.toBeNull();
    await expect(access(scaffold.files.prompt)).resolves.toBeNull();
    await expect(access(scaffold.files.plan)).resolves.toBeNull();
    await expect(access(scaffold.files.implementation)).rejects.toThrow();
    await expect(access(scaffold.files.reviewSpec)).resolves.toBeNull();
    await expect(access(scaffold.files.reviewQuality)).resolves.toBeNull();
    await expect(access(scaffold.files.test)).resolves.toBeNull();
    await expect(access(scaffold.files.transcript)).resolves.toBeNull();

    expect(await readFile(scaffold.files.prompt, "utf8")).toContain("docs-review");
    expect(await readFile(scaffold.files.plan, "utf8")).toContain("Status: approved");
    expect(await readFile(scaffold.files.test, "utf8")).toContain("summarizeDocReview");
  });

  test("runs the installed harness with docs-review scaffold and repo cwd", async () => {
    const commands: Array<ClaudeInstalledLiveHarnessCommand & { cwd: string }> = [];

    const result = await runClaudeInstalledLiveHarness({
      manifestPath,
      env: { CLAUDE_INSTALLED_LIVE: "1" },
      exec: async (command, scenario, scaffold) => {
        commands.push({ ...command, cwd: scaffold.repoDir });
        return {
          stdout: [
            "[install] plugin imitation-machine@imitation-machine-dev installed",
            "[skills] visible: using-agentic, executing-plans, review-spec, review-quality, verify",
            "[route] workflow: executing-plans",
            "[skill] workflow skill loaded: executing-plans",
            "[plan] status: approved",
            `[plan] file: ${scaffold.files.plan}`,
            "[impl] wrote src/docs/review.ts",
            "[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec",
            "[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality",
            "[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify",
            "[state] review-ready",
          ].join("\n"),
          stderr: "",
          exitCode: 0,
        };
      },
    });

    expect(result.skipped).toBe(false);
    expect(result.summary).toEqual({ total: 1, passed: 1, failed: 0 });
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({
      executable: "claude",
      args: ["--print", expect.stringContaining("docs-review")],
    });
    expect(commands[0]!.cwd).toContain("executable-workflow-harness-");
    expect(result.results[0]?.evaluation).toEqual({
      valid: true,
      workflowRoute: "executing-plans",
      stages: [
        "install-visible-skills",
        "workflow-routing",
        "plan-approved",
        "implementation-written",
        "review-spec-passed",
        "review-quality-passed",
        "verification-fresh",
        "review-ready",
      ],
      issues: [],
    });
  });

  test("rejects wrong review order and stale or missing verify evidence", () => {
    const reversed = evaluateClaudeInstalledLiveTranscript(`
[install] plugin imitation-machine@imitation-machine-dev installed
[skills] visible: using-agentic, executing-plans, review-spec, review-quality, verify
[route] workflow: executing-plans
[skill] workflow skill loaded: executing-plans
[plan] status: approved
[impl] wrote src/docs/review.ts
[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality
[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec
[state] review-ready
`);
    const stale = evaluateClaudeInstalledLiveTranscript(`
[install] plugin imitation-machine@imitation-machine-dev installed
[skills] visible: using-agentic, executing-plans, review-spec, review-quality, verify
[route] workflow: executing-plans
[skill] workflow skill loaded: executing-plans
[plan] status: approved
[impl] wrote src/docs/review.ts
[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec
[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality
[verify] evidence source=previous-run age=2h command=bun test
[state] review-ready
`);

    expect(reversed.valid).toBe(false);
    expect(reversed.issues).toContain("Review sequence violated: review-spec must precede review-quality");
    expect(reversed.issues).toContain("Missing fresh verification evidence");

    expect(stale.valid).toBe(false);
    expect(stale.issues).toContain(
      "Stale verification evidence: [verify] evidence source=previous-run age=2h command=bun test",
    );
  });

  test("rejects implementation before approved plan", () => {
    const evaluation = evaluateClaudeInstalledLiveTranscript(`
[install] plugin imitation-machine@imitation-machine-dev installed
[skills] visible: using-agentic, executing-plans, review-spec, review-quality, verify
[route] workflow: executing-plans
[skill] workflow skill loaded: executing-plans
[impl] wrote src/docs/review.ts
[plan] status: approved
[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec
[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality
[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify
[state] review-ready
`);

    expect(evaluation.valid).toBe(false);
    expect(evaluation.issues).toContain(
      "Implementation sequence violated: approved plan must precede implementation",
    );
  });

  test("rejects review-ready before fresh verify", () => {
    const evaluation = evaluateClaudeInstalledLiveTranscript(`
[install] plugin imitation-machine@imitation-machine-dev installed
[skills] visible: using-agentic, executing-plans, review-spec, review-quality, verify
[route] workflow: executing-plans
[skill] workflow skill loaded: executing-plans
[plan] status: approved
[impl] wrote src/docs/review.ts
[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec
[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality
[state] review-ready
[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify
`);

    expect(evaluation.valid).toBe(false);
    expect(evaluation.issues).toContain(
      "Review-ready sequence violated: fresh verification must precede review-ready",
    );
  });
});
