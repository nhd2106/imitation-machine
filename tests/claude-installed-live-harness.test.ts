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
const cleanupPaths = new Set<string>();

const initialInstalledTranscript = [
  "[install] plugin imitation-machine@imitation-machine-dev installed",
  "[skills] visible: using-agentic, executing-plans, review-spec, review-quality, verify",
  "[route] workflow: executing-plans",
  "[skill] workflow skill loaded: executing-plans",
  "[plan] status: approved",
  "[impl] wrote src/docs/review.ts",
  "[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec-turn-1",
  "[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality-turn-1",
  "[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify-turn-1",
  "[state] review-ready",
].join("\n");

async function writeManifest(contents: object): Promise<string> {
  const path = `/tmp/claude-installed-live-harness-${crypto.randomUUID()}.json`;
  await Bun.write(path, JSON.stringify(contents));
  cleanupPaths.add(path);
  return path;
}

afterEach(async () => {
  await Promise.all(
    [...cleanupPaths].map(async (path) => {
      cleanupPaths.delete(path);
      await rm(path, { recursive: true, force: true });
    }),
  );
});

describe("Claude installed live harness", () => {
  test("loads the checked-in installed Claude scenario manifest", async () => {
    const manifest = await loadClaudeInstalledLiveScenarioManifest(manifestPath);

    expect(manifest.scenarios.map((scenario) => scenario.id)).toEqual([
      "installed-docs-review-continuation-happy-path",
      "installed-docs-review-continuation-stale-verification-after-continue",
      "installed-docs-review-continuation-missing-rerun-after-write",
    ]);
  });

  test("builds direct Claude argv for first and continued installed turns", () => {
    expect(buildClaudeInstalledLiveHarnessCommand({ prompt: "run it" })).toEqual({
      executable: "claude",
      args: ["--print", "run it"],
    });

    expect(
      buildClaudeInstalledLiveHarnessCommand({ prompt: "continue it", continueSession: true }),
    ).toEqual({
      executable: "claude",
      args: ["--print", "--continue", "continue it"],
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
    expect(result.summary).toEqual({ total: 3, passed: 0, failed: 0 });
    expect(executed).toBe(false);
  });

  test("scaffolds the installed docs-review temp repo from the executable harness", async () => {
    const manifest = await loadClaudeInstalledLiveScenarioManifest(manifestPath);
    const scenario = manifest.scenarios[0]!;
    const scaffold = await scaffoldClaudeInstalledLiveHarnessScenario(scenario);
    cleanupPaths.add(scaffold.repoDir);

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

  test("runs the installed harness with docs-review scaffold reuse and continued repo cwd", async () => {
    const customManifestPath = await writeManifest({
      scenarios: [
        {
          id: "installed-docs-review-continuation",
          turns: [
            {
              prompt: "start the docs-review lane",
              expect: {
                valid: true,
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
              },
            },
            {
              prompt: "continue the docs-review lane",
              expect: {
                valid: true,
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
              },
            },
          ],
          scaffold: {
            archetype: "docs-review",
            planId: "PLN-PR37",
            taskId: "TSK-PR37-1",
          },
        },
      ],
    });
    const commands: Array<ClaudeInstalledLiveHarnessCommand & { cwd: string }> = [];
    let executions = 0;

    const result = await runClaudeInstalledLiveHarness({
      manifestPath: customManifestPath,
      env: { CLAUDE_INSTALLED_LIVE: "1" },
      exec: async (command, _scenario, scaffold) => {
        commands.push({ ...command, cwd: scaffold.repoDir });
        executions += 1;
        return {
          stdout:
            executions === 2
              ? [
                  "[state] carrying-forward prior installed Claude session context",
                  "[impl] wrote src/docs/review.ts",
                  "[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec-turn-2",
                  "[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality-turn-2",
                  "[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify-turn-2",
                  "[state] review-ready",
                ].join("\n")
              : initialInstalledTranscript,
          stderr: "",
          exitCode: 0,
        };
      },
    });

    expect(result.skipped).toBe(false);
    expect(result.summary).toEqual({ total: 1, passed: 1, failed: 0 });
    expect(commands).toEqual([
      {
        executable: "claude",
        args: ["--print", "start the docs-review lane"],
        cwd: expect.stringContaining("executable-workflow-harness-"),
      },
      {
        executable: "claude",
        args: ["--print", "--continue", "continue the docs-review lane"],
        cwd: expect.stringContaining("executable-workflow-harness-"),
      },
    ]);
    expect(commands[0]!.cwd).toBe(commands[1]!.cwd);
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
    expect(result.results[0]?.turns).toMatchObject([
      { index: 0, ok: true, command: { args: ["--print", "start the docs-review lane"] } },
      {
        index: 1,
        ok: true,
        command: { args: ["--print", "--continue", "continue the docs-review lane"] },
      },
    ]);
  });

  test("evaluates continuation transcripts from the checked-in installed manifest and fixtures", async () => {
    const continuationHappyTranscript = await Bun.file(
      "tests/harness-fixtures/claude-installed-continuation-happy.txt",
    ).text();
    const continuationStaleTranscript = await Bun.file(
      "tests/harness-fixtures/claude-installed-continuation-stale-verification.txt",
    ).text();
    const continuationMissingRerunTranscript = await Bun.file(
      "tests/harness-fixtures/claude-installed-continuation-missing-rerun-after-write.txt",
    ).text();
    const transcripts = new Map([
      ["installed-docs-review-continuation-happy-path:0", initialInstalledTranscript],
      ["installed-docs-review-continuation-happy-path:1", continuationHappyTranscript],
      [
        "installed-docs-review-continuation-stale-verification-after-continue:0",
        initialInstalledTranscript,
      ],
      [
        "installed-docs-review-continuation-stale-verification-after-continue:1",
        continuationStaleTranscript,
      ],
      [
        "installed-docs-review-continuation-missing-rerun-after-write:0",
        initialInstalledTranscript,
      ],
      [
        "installed-docs-review-continuation-missing-rerun-after-write:1",
        continuationMissingRerunTranscript,
      ],
    ]);
    const turnCounts = new Map<string, number>();

    const result = await runClaudeInstalledLiveHarness({
      manifestPath,
      env: { CLAUDE_INSTALLED_LIVE: "1" },
      exec: async (_command, scenario, scaffold) => {
        cleanupPaths.add(scaffold.repoDir);
        const turnIndex = turnCounts.get(scenario.id) ?? 0;
        turnCounts.set(scenario.id, turnIndex + 1);

        return {
          stdout: transcripts.get(`${scenario.id}:${turnIndex}`) ?? "",
          stderr: "",
          exitCode: 0,
        };
      },
    });

    expect(result.skipped).toBe(false);
    expect(result.summary).toEqual({ total: 3, passed: 3, failed: 0 });
    expect(result.results).toMatchObject([
      {
        id: "installed-docs-review-continuation-happy-path",
        ok: true,
        evaluation: {
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
        },
        turns: [
          { index: 0, ok: true, command: { args: ["--print", expect.any(String)] } },
          {
            index: 1,
            ok: true,
            command: { args: ["--print", "--continue", expect.any(String)] },
          },
        ],
      },
      {
        id: "installed-docs-review-continuation-stale-verification-after-continue",
        ok: true,
        evaluation: {
          valid: false,
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
          issues: [
            "Stale verification evidence: [verify] evidence source=previous-run age=2h command=bun test tests/docs/review.test.ts",
          ],
        },
      },
      {
        id: "installed-docs-review-continuation-missing-rerun-after-write",
        ok: true,
        evaluation: {
          valid: false,
          workflowRoute: "executing-plans",
          stages: [
            "install-visible-skills",
            "workflow-routing",
            "plan-approved",
            "implementation-written",
          ],
          issues: [
            "Latest implementation invalidated prior review/verify evidence; rerun review-spec, review-quality, and fresh verification",
          ],
        },
      },
    ]);
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

  test("invalidates prior review and verify evidence after a later continuation write", () => {
    const evaluation = evaluateClaudeInstalledLiveTranscript(`
[install] plugin imitation-machine@imitation-machine-dev installed
[skills] visible: using-agentic, executing-plans, review-spec, review-quality, verify
[route] workflow: executing-plans
[skill] workflow skill loaded: executing-plans
[plan] status: approved
[impl] wrote src/docs/review.ts
[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec-turn-1
[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality-turn-1
[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify-turn-1
[state] review-ready
[state] carrying-forward prior installed Claude session context
[impl] wrote src/docs/review.ts
[state] review-ready
`);

    expect(evaluation.valid).toBe(false);
    expect(evaluation.stages).toEqual([
      "install-visible-skills",
      "workflow-routing",
      "plan-approved",
      "implementation-written",
    ]);
    expect(evaluation.issues).toEqual([
      "Latest implementation invalidated prior review/verify evidence; rerun review-spec, review-quality, and fresh verification",
    ]);
  });
});
