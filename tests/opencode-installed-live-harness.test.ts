import { afterEach, describe, expect, test } from "bun:test";
import { access, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  buildOpenCodeInstalledLiveHarnessCommand,
  evaluateOpenCodeInstalledLiveTranscript,
  loadOpenCodeInstalledLiveScenarioManifest,
  runOpenCodeInstalledLiveHarness,
  scaffoldOpenCodeInstalledLiveHarnessScenario,
  type OpenCodeInstalledLiveHarnessCommand,
} from "../scripts/opencode-installed-live-harness";

const manifestPath = new URL("./opencode/installed-live-scenarios.json", import.meta.url).pathname;
const cleanupPaths = new Set<string>();

const initialInstalledTranscript = [
  "[install] surface=opencode imitation-machine active",
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
  const path = `/tmp/opencode-installed-live-harness-${crypto.randomUUID()}.json`;
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

describe("OpenCode installed live harness", () => {
  test("keeps the installed lane discoverable with a package-level script", async () => {
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["test:opencode:installed"]).toBe("bash tests/opencode/run-tests.sh installed");
  });

  test("loads the checked-in installed OpenCode scenario manifest", async () => {
    const manifest = await loadOpenCodeInstalledLiveScenarioManifest(manifestPath);

    expect(manifest.scenarios.map((scenario) => scenario.id)).toEqual([
      "installed-docs-review-long-running-happy-path",
    ]);
    expect(manifest.scenarios[0]?.turns).toHaveLength(3);
  });

  test("builds direct OpenCode argv for first and continued installed turns", () => {
    expect(buildOpenCodeInstalledLiveHarnessCommand({ prompt: "run it" })).toEqual({
      executable: "opencode",
      args: ["run", "--print-logs", "run it"],
    });

    expect(
      buildOpenCodeInstalledLiveHarnessCommand({
        prompt: "continue it",
        continueSession: true,
      }),
    ).toEqual({
      executable: "opencode",
      args: ["run", "--print-logs", "--continue", "continue it"],
    });
  });

  test("skips cleanly when installed live mode env is disabled", async () => {
    let executed = false;

    const result = await runOpenCodeInstalledLiveHarness({
      manifestPath,
      env: {},
      exec: async () => {
        executed = true;
        return { stdout: "", stderr: "", exitCode: 0 };
      },
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("OPENCODE_INSTALLED_LIVE=1");
    expect(result.summary).toEqual({ total: 1, passed: 0, failed: 0 });
    expect(executed).toBe(false);
  });

  test("scaffolds the installed docs-review temp repo from the executable harness", async () => {
    const manifest = await loadOpenCodeInstalledLiveScenarioManifest(manifestPath);
    const scenario = manifest.scenarios[0]!;
    const scaffold = await scaffoldOpenCodeInstalledLiveHarnessScenario(scenario);
    cleanupPaths.add(scaffold.repoDir);

    expect(scaffold.files).toEqual({
      packageJson: join(scaffold.repoDir, "package.json"),
      prompt: join(scaffold.repoDir, "prompts", "opencode-installed-live.txt"),
      plan: join(scaffold.repoDir, "plans", "PLN-PR37.md"),
      implementation: join(scaffold.repoDir, "src", "docs", "review.ts"),
      reviewSpec: join(scaffold.repoDir, "scripts", "review-spec.ts"),
      reviewQuality: join(scaffold.repoDir, "scripts", "review-quality.ts"),
      test: join(scaffold.repoDir, "tests", "docs", "review.test.ts"),
      transcript: join(scaffold.repoDir, "artifacts", "opencode-installed-live.log"),
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

  test("runs the installed harness with one reused docs-review scaffold across three continued turns", async () => {
    const customManifestPath = await writeManifest({
      scenarios: [
        {
          id: "installed-docs-review-long-running",
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
            {
              prompt: "continue the docs-review lane one more time",
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
    const commands: Array<OpenCodeInstalledLiveHarnessCommand & { cwd: string }> = [];
    let executions = 0;

    const result = await runOpenCodeInstalledLiveHarness({
      manifestPath: customManifestPath,
      env: { OPENCODE_INSTALLED_LIVE: "1" },
      exec: async (command, _scenario, scaffold) => {
        cleanupPaths.add(scaffold.repoDir);
        commands.push({ ...command, cwd: scaffold.repoDir });
        executions += 1;
        return {
          stdout:
            executions === 2
              ? [
                  "[state] carrying-forward prior installed OpenCode session context",
                  "[impl] wrote src/docs/review.ts",
                  "[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec-turn-2",
                  "[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality-turn-2",
                  "[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify-turn-2",
                  "[state] review-ready",
                ].join("\n")
              : executions === 3
                ? [
                    "[state] carrying-forward prior installed OpenCode session context",
                    "[impl] wrote src/docs/review.ts",
                    "[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec-turn-3",
                    "[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality-turn-3",
                    "[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify-turn-3",
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
        executable: "opencode",
        args: ["run", "--print-logs", "start the docs-review lane"],
        cwd: expect.stringContaining("executable-workflow-harness-"),
      },
      {
        executable: "opencode",
        args: ["run", "--print-logs", "--continue", "continue the docs-review lane"],
        cwd: expect.stringContaining("executable-workflow-harness-"),
      },
      {
        executable: "opencode",
        args: ["run", "--print-logs", "--continue", "continue the docs-review lane one more time"],
        cwd: expect.stringContaining("executable-workflow-harness-"),
      },
    ]);
    expect(commands[0]!.cwd).toBe(commands[1]!.cwd);
    expect(commands[1]!.cwd).toBe(commands[2]!.cwd);
    expect(cleanupPaths.has(commands[0]!.cwd)).toBe(true);
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
      {
        index: 0,
        ok: true,
        command: { args: ["run", "--print-logs", "start the docs-review lane"] },
      },
      {
        index: 1,
        ok: true,
        command: { args: ["run", "--print-logs", "--continue", "continue the docs-review lane"] },
      },
      {
        index: 2,
        ok: true,
        command: {
          args: ["run", "--print-logs", "--continue", "continue the docs-review lane one more time"],
        },
      },
    ]);
  });

  test("evaluates the checked-in three-turn installed happy path fixtures", async () => {
    const turnTwoTranscript = await Bun.file(
      "tests/harness-fixtures/opencode-installed-long-running-happy-turn-2.log",
    ).text();
    const turnThreeTranscript = await Bun.file(
      "tests/harness-fixtures/opencode-installed-long-running-happy-turn-3.log",
    ).text();
    const transcripts = new Map([
      ["installed-docs-review-long-running-happy-path:0", initialInstalledTranscript],
      ["installed-docs-review-long-running-happy-path:1", turnTwoTranscript],
      ["installed-docs-review-long-running-happy-path:2", turnThreeTranscript],
    ]);
    const turnCounts = new Map<string, number>();

    const result = await runOpenCodeInstalledLiveHarness({
      manifestPath,
      env: { OPENCODE_INSTALLED_LIVE: "1" },
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
    expect(result.summary).toEqual({ total: 1, passed: 1, failed: 0 });
    expect(result.results).toMatchObject([
      {
        id: "installed-docs-review-long-running-happy-path",
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
          { index: 0, ok: true, command: { args: ["run", "--print-logs", expect.any(String)] } },
          {
            index: 1,
            ok: true,
            command: { args: ["run", "--print-logs", "--continue", expect.any(String)] },
          },
          {
            index: 2,
            ok: true,
            command: { args: ["run", "--print-logs", "--continue", expect.any(String)] },
          },
        ],
      },
    ]);
  });

  test("rejects wrong review order and stale or missing verify evidence", () => {
    const reversed = evaluateOpenCodeInstalledLiveTranscript(`
[install] surface=opencode imitation-machine active
[skills] visible: using-agentic, executing-plans, review-spec, review-quality, verify
[route] workflow: executing-plans
[skill] workflow skill loaded: executing-plans
[plan] status: approved
[impl] wrote src/docs/review.ts
[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality
[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec
[state] review-ready
`);
    const stale = evaluateOpenCodeInstalledLiveTranscript(`
[install] surface=opencode imitation-machine active
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
    const evaluation = evaluateOpenCodeInstalledLiveTranscript(`
[install] surface=opencode imitation-machine active
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
    const evaluation = evaluateOpenCodeInstalledLiveTranscript(`
[install] surface=opencode imitation-machine active
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
    const evaluation = evaluateOpenCodeInstalledLiveTranscript(`
[install] surface=opencode imitation-machine active
[skills] visible: using-agentic, executing-plans, review-spec, review-quality, verify
[route] workflow: executing-plans
[skill] workflow skill loaded: executing-plans
[plan] status: approved
[impl] wrote src/docs/review.ts
[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec-turn-1
[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality-turn-1
[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify-turn-1
[state] review-ready
[state] carrying-forward prior installed OpenCode session context
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
    expect(evaluation.issues).toContain(
      "Latest implementation invalidated prior review/verify evidence; rerun review-spec, review-quality, and fresh verification",
    );
  });
});
