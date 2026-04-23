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
  "[test-fail] command=bun test exit=1 stdout-sha256=fail-turn-1",
  "[impl] wrote src/cli/service.ts",
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

async function runBunTestInRepo(repoDir: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", "test"], {
    cwd: repoDir,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
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
      "installed-cli-service-long-running-happy-path",
    ]);
    expect(manifest.scenarios[0]?.turns).toHaveLength(3);
    expect(manifest.scenarios[0]?.turns?.[0]?.prompt).toContain(
      "[install] surface=opencode imitation-machine active",
    );
    expect(manifest.scenarios[0]?.turns?.[0]?.prompt).toContain(
      "[test-fail] command=bun test exit=1",
    );
    expect(manifest.scenarios[0]?.turns?.[1]?.prompt).toContain(
      "[state] carrying-forward prior installed OpenCode session context",
    );
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

  test("scaffolds the installed cli-service temp repo from the executable harness", async () => {
    const manifest = await loadOpenCodeInstalledLiveScenarioManifest(manifestPath);
    const scenario = manifest.scenarios[0]!;
    const scaffold = await scaffoldOpenCodeInstalledLiveHarnessScenario(scenario);
    cleanupPaths.add(scaffold.repoDir);

    expect(scaffold.files).toEqual({
      packageJson: join(scaffold.repoDir, "package.json"),
      prompt: join(scaffold.repoDir, "prompts", "opencode-installed-live.txt"),
      plan: join(scaffold.repoDir, "plans", "PLN-PR50.md"),
      implementation: join(scaffold.repoDir, "src", "cli", "service.ts"),
      reviewSpec: join(scaffold.repoDir, "scripts", "review-spec.ts"),
      reviewQuality: join(scaffold.repoDir, "scripts", "review-quality.ts"),
      test: join(scaffold.repoDir, "tests", "cli", "service.test.ts"),
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

    expect(await readFile(scaffold.files.prompt, "utf8")).toContain("cli-service");
    expect(await readFile(scaffold.files.plan, "utf8")).toContain("Status: approved");
    expect(await readFile(scaffold.files.test, "utf8")).toContain("formatCommandResult");
  });

  test("proves the scaffolded cli-service repo fails before implementation and passes after the minimal write", async () => {
    const manifest = await loadOpenCodeInstalledLiveScenarioManifest(manifestPath);
    const scenario = manifest.scenarios[0]!;
    const scaffold = await scaffoldOpenCodeInstalledLiveHarnessScenario(scenario);
    cleanupPaths.add(scaffold.repoDir);

    const failingRun = await runBunTestInRepo(scaffold.repoDir);
    expect(failingRun.exitCode).toBeGreaterThan(0);

    await Bun.write(
      scaffold.files.implementation,
      'export function formatCommandResult(commandName: string): string {\n  return `cli-service:${commandName}`;\n}\n',
    );

    const passingRun = await runBunTestInRepo(scaffold.repoDir);
    expect(passingRun.exitCode).toBe(0);
  });

  test("runs the installed harness with one reused cli-service scaffold across three continued turns", async () => {
    const customManifestPath = await writeManifest({
      scenarios: [
        {
          id: "installed-cli-service-long-running",
          turns: [
            {
              prompt: "start the cli-service lane",
              expect: {
                valid: true,
                stages: [
                  "install-visible-skills",
                  "workflow-routing",
                  "plan-approved",
                  "failing-test-observed",
                  "implementation-written",
                  "review-spec-passed",
                  "review-quality-passed",
                  "verification-fresh",
                  "review-ready",
                ],
              },
            },
            {
              prompt: "continue the cli-service lane",
              expect: {
                valid: true,
                stages: [
                  "install-visible-skills",
                  "workflow-routing",
                  "plan-approved",
                  "failing-test-observed",
                  "implementation-written",
                  "review-spec-passed",
                  "review-quality-passed",
                  "verification-fresh",
                  "review-ready",
                ],
              },
            },
            {
              prompt: "continue the cli-service lane one more time",
              expect: {
                valid: true,
                stages: [
                  "install-visible-skills",
                  "workflow-routing",
                  "plan-approved",
                  "failing-test-observed",
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
            archetype: "cli-service",
            planId: "PLN-PR50",
            taskId: "TSK-PR50-1",
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
                  "[impl] wrote src/cli/service.ts",
                  "[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec-turn-2",
                  "[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality-turn-2",
                  "[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify-turn-2",
                  "[state] review-ready",
                ].join("\n")
              : executions === 3
                ? [
                    "[state] carrying-forward prior installed OpenCode session context",
                    "[impl] wrote src/cli/service.ts",
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
        args: ["run", "--print-logs", "start the cli-service lane"],
        cwd: expect.stringContaining("executable-workflow-harness-"),
      },
      {
        executable: "opencode",
        args: ["run", "--print-logs", "--continue", "continue the cli-service lane"],
        cwd: expect.stringContaining("executable-workflow-harness-"),
      },
      {
        executable: "opencode",
        args: ["run", "--print-logs", "--continue", "continue the cli-service lane one more time"],
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
        "failing-test-observed",
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
        command: { args: ["run", "--print-logs", "start the cli-service lane"] },
      },
      {
        index: 1,
        ok: true,
        command: { args: ["run", "--print-logs", "--continue", "continue the cli-service lane"] },
      },
      {
        index: 2,
        ok: true,
        command: {
          args: ["run", "--print-logs", "--continue", "continue the cli-service lane one more time"],
        },
      },
    ]);
  });

  test("evaluates the checked-in three-turn installed happy path fixtures", async () => {
    const turnTwoTranscript = await Bun.file(
      "tests/harness-fixtures/opencode-installed-cli-service-happy-turn-2.log",
    ).text();
    const turnThreeTranscript = await Bun.file(
      "tests/harness-fixtures/opencode-installed-cli-service-happy-turn-3.log",
    ).text();
    const transcripts = new Map([
      ["installed-cli-service-long-running-happy-path:0", initialInstalledTranscript],
      ["installed-cli-service-long-running-happy-path:1", turnTwoTranscript],
      ["installed-cli-service-long-running-happy-path:2", turnThreeTranscript],
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
        id: "installed-cli-service-long-running-happy-path",
        ok: true,
        evaluation: {
          valid: true,
          workflowRoute: "executing-plans",
          stages: [
            "install-visible-skills",
            "workflow-routing",
            "plan-approved",
            "failing-test-observed",
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

  test("accepts real installed transcripts when marker lines end with punctuation", () => {
    const evaluation = evaluateOpenCodeInstalledLiveTranscript(`
Inspecting the scaffolded cli-service repo first.
\`\`\`text
[install] surface=opencode imitation-machine active ;
[skills] visible: using-agentic, executing-plans, review-spec, review-quality, verify ;
[route] workflow: executing-plans ;
[plan] status: approved ;
[test-fail] command=bun test exit=1 stdout-sha256=fail-turn-1 ;
[impl] wrote src/cli/service.ts ;
[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec-turn-1 ;
[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality-turn-1 ;
[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify-turn-1 ;
[state] review-ready.
\`\`\`
`);

    expect(evaluation).toEqual({
      valid: true,
      workflowRoute: "executing-plans",
      stages: [
        "install-visible-skills",
        "workflow-routing",
        "plan-approved",
        "failing-test-observed",
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
    const reversed = evaluateOpenCodeInstalledLiveTranscript(`
[install] surface=opencode imitation-machine active
[skills] visible: using-agentic, executing-plans, review-spec, review-quality, verify
[route] workflow: executing-plans
[skill] workflow skill loaded: executing-plans
[plan] status: approved
[test-fail] command=bun test exit=1 stdout-sha256=fail
[impl] wrote src/cli/service.ts
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
[test-fail] command=bun test exit=1 stdout-sha256=fail
[impl] wrote src/cli/service.ts
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
[impl] wrote src/cli/service.ts
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

  test("rejects transcripts missing fail-to-pass evidence before implementation", () => {
    const evaluation = evaluateOpenCodeInstalledLiveTranscript(`
[install] surface=opencode imitation-machine active
[skills] visible: using-agentic, executing-plans, review-spec, review-quality, verify
[route] workflow: executing-plans
[skill] workflow skill loaded: executing-plans
[plan] status: approved
[impl] wrote src/cli/service.ts
[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec
[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality
[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify
[state] review-ready
`);

    expect(evaluation.valid).toBe(false);
    expect(evaluation.issues).toContain("Missing fail-to-pass evidence before implementation");
  });

  test("rejects review-ready before fresh verify", () => {
    const evaluation = evaluateOpenCodeInstalledLiveTranscript(`
[install] surface=opencode imitation-machine active
[skills] visible: using-agentic, executing-plans, review-spec, review-quality, verify
[route] workflow: executing-plans
[skill] workflow skill loaded: executing-plans
[plan] status: approved
[test-fail] command=bun test exit=1 stdout-sha256=fail
[impl] wrote src/cli/service.ts
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
[test-fail] command=bun test exit=1 stdout-sha256=fail-turn-1
[impl] wrote src/cli/service.ts
[review-spec] command=bun scripts/review-spec.ts exit=0 evidence-sha256=spec-turn-1
[review-quality] command=bun scripts/review-quality.ts exit=0 evidence-sha256=quality-turn-1
[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=verify-turn-1
[state] review-ready
[state] carrying-forward prior installed OpenCode session context
[impl] wrote src/cli/service.ts
[state] review-ready
`);

    expect(evaluation.valid).toBe(false);
    expect(evaluation.stages).toEqual([
      "install-visible-skills",
      "workflow-routing",
      "plan-approved",
      "failing-test-observed",
      "implementation-written",
    ]);
    expect(evaluation.issues).toContain(
      "Latest implementation invalidated prior review/verify evidence; rerun review-spec, review-quality, and fresh verification",
    );
  });
});
