import { describe, expect, test } from "bun:test";
import {
  buildClaudeLiveHarnessCommand,
  loadClaudeLiveScenarioManifest,
  runClaudeLiveHarness,
  type ClaudeLiveHarnessCommand,
} from "../scripts/claude-live-harness";

const manifestPath = new URL("./claude-code/live-scenarios.json", import.meta.url).pathname;

async function writeManifest(contents: object): Promise<string> {
  const path = `/tmp/claude-live-harness-${crypto.randomUUID()}.json`;
  await Bun.write(path, JSON.stringify(contents));
  return path;
}

describe("Claude live harness", () => {
  test("loads the checked-in Claude live scenario manifest", async () => {
    const manifest = await loadClaudeLiveScenarioManifest(manifestPath);

    expect(manifest.scenarios.map((scenario) => scenario.id)).toEqual([
      "continuation-happy-path",
      "continuation-stale-verification",
    ]);
  });

  test("builds direct Claude argv for first and continued turns", () => {
    expect(buildClaudeLiveHarnessCommand({ prompt: "hello" })).toEqual({
      executable: "claude",
      args: ["--print", "hello"],
    });

    expect(buildClaudeLiveHarnessCommand({ prompt: "continue", continueSession: true })).toEqual({
      executable: "claude",
      args: ["--print", "--continue", "continue"],
    });
  });

  test("skips cleanly when live mode env is disabled", async () => {
    let executed = false;

    const result = await runClaudeLiveHarness({
      manifestPath,
      env: {},
      exec: async () => {
        executed = true;
        return { stdout: "", stderr: "", exitCode: 0 };
      },
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("CLAUDE_LIVE=1");
    expect(result.summary).toEqual({ total: 2, passed: 0, failed: 0 });
    expect(executed).toBe(false);
  });

  test("constructs Claude continuation commands with --continue on later turns", async () => {
    const customManifestPath = await writeManifest({
      scenarios: [
        {
          id: "continuation",
          turns: [
            {
              prompt: "bootstrap",
              expect: {
                valid: true,
                stages: ["install-visible-skills", "workflow-routing", "review-ready"],
              },
            },
            {
              prompt: "continue",
              expect: {
                valid: true,
                stages: ["install-visible-skills", "workflow-routing", "review-ready"],
              },
            },
          ],
        },
      ],
    });
    const commands: ClaudeLiveHarnessCommand[] = [];

    await runClaudeLiveHarness({
      manifestPath: customManifestPath,
      env: { CLAUDE_LIVE: "1" },
      exec: async (command) => {
        commands.push(command);
        return {
          stdout:
            "[install] plugin imitation-machine@imitation-machine-dev installed\n[skills] visible: using-agentic, requesting-code-review, review-spec, review-quality\n[route] workflow: requesting-code-review\n[state] review-ready\n",
          stderr: "",
          exitCode: 0,
        };
      },
    });

    expect(commands).toEqual([
      { executable: "claude", args: ["--print", "bootstrap"] },
      { executable: "claude", args: ["--print", "--continue", "continue"] },
    ]);
  });

  test("evaluates continuation transcripts from the checked-in Claude manifest and fixtures", async () => {
    const continuationHappyTranscript = await Bun.file(
      "tests/harness-fixtures/claude-continuation-happy.txt",
    ).text();
    const continuationStaleTranscript = await Bun.file(
      "tests/harness-fixtures/claude-continuation-stale-verification.txt",
    ).text();
    const transcripts = new Map([
      [
        "continuation-happy-path:0",
        "[install] plugin imitation-machine@imitation-machine-dev installed\n[skills] visible: using-agentic, requesting-code-review, review-spec, review-quality\n[route] workflow: requesting-code-review\n[state] review-ready\n",
      ],
      ["continuation-happy-path:1", continuationHappyTranscript],
      [
        "continuation-stale-verification:0",
        "[install] plugin imitation-machine@imitation-machine-dev installed\n[skills] visible: using-agentic, requesting-code-review, review-spec, review-quality\n[route] workflow: requesting-code-review\n[state] review-ready\n",
      ],
      ["continuation-stale-verification:1", continuationStaleTranscript],
    ]);

    const result = await runClaudeLiveHarness({
      manifestPath,
      env: { CLAUDE_LIVE: "1" },
      exec: async (_command, scenario, turn) => ({
        stdout: transcripts.get(`${scenario.id}:${turn.index}`) ?? "",
        stderr: "",
        exitCode: 0,
      }),
    });

    expect(result.skipped).toBe(false);
    expect(result.summary).toEqual({ total: 2, passed: 2, failed: 0 });
    expect(result.results).toMatchObject([
      {
        id: "continuation-happy-path",
        ok: true,
        evaluation: {
          valid: true,
          workflowRoute: "requesting-code-review",
          stages: ["install-visible-skills", "workflow-routing", "review-ready"],
        },
        turns: [
          { index: 0, ok: true, command: { args: ["--print", expect.any(String)] } },
          {
            index: 1,
            ok: true,
            command: { args: ["--print", "--continue", expect.any(String)] },
            evaluation: {
              valid: true,
              workflowRoute: "requesting-code-review",
            },
          },
        ],
      },
      {
        id: "continuation-stale-verification",
        ok: true,
        evaluation: {
          valid: false,
          workflowRoute: "requesting-code-review",
          issues: [
            "Stale verification evidence: [verify] evidence source=previous-run age=2h command=bun test tests/claude-harness.test.ts",
          ],
        },
      },
    ]);
  });

  test("reports continuation failures with turn-specific prefixes", async () => {
    const customManifestPath = await writeManifest({
      scenarios: [
        {
          id: "continuation-failure",
          turns: [
            {
              prompt: "bootstrap",
              expect: {
                valid: true,
                stages: ["install-visible-skills", "workflow-routing", "review-ready"],
              },
            },
            {
              prompt: "continue",
              expect: {
                valid: false,
                stages: ["install-visible-skills", "workflow-routing", "review-ready"],
                issues: [
                  "Stale verification evidence: [verify] evidence source=previous-run age=2h command=bun test tests/claude-harness.test.ts",
                ],
              },
            },
          ],
        },
      ],
    });

    const result = await runClaudeLiveHarness({
      manifestPath: customManifestPath,
      env: { CLAUDE_LIVE: "1" },
      exec: async (_command, _scenario, turn) => ({
        stdout:
          turn.index === 0
            ? "[install] plugin imitation-machine@imitation-machine-dev installed\n[skills] visible: using-agentic, requesting-code-review, review-spec, review-quality\n[route] workflow: requesting-code-review\n[state] review-ready\n"
            : "[state] review-ready\n",
        stderr: "",
        exitCode: 0,
      }),
    });

    expect(result.summary.failed).toBe(1);
    expect(result.results[0]?.failureReasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Turn 2: Expected valid=false, received valid=true"),
        expect.stringContaining(
          "Turn 2: Missing expected issue: Stale verification evidence: [verify] evidence source=previous-run age=2h command=bun test tests/claude-harness.test.ts",
        ),
      ]),
    );
  });
});
