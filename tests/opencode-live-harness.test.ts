import { describe, expect, test } from "bun:test";
import {
  buildLiveHarnessCommand,
  loadLiveScenarioManifest,
  runLiveHarness,
  type LiveHarnessCommand,
} from "../scripts/opencode-live-harness";

const manifestPath = new URL("./opencode/live-scenarios.json", import.meta.url).pathname;

async function writeManifest(contents: object): Promise<string> {
  const path = `/tmp/opencode-live-harness-${crypto.randomUUID()}.json`;
  await Bun.write(path, JSON.stringify(contents));
  return path;
}

function getResultsById(
  result: Awaited<ReturnType<typeof runLiveHarness>>,
): Map<string, (typeof result.results)[number]> {
  return new Map(result.results.map((scenario) => [scenario.id, scenario]));
}

describe("OpenCode live harness", () => {
  test("loads the checked-in live scenario manifest", async () => {
    const manifest = await loadLiveScenarioManifest(manifestPath);
    const scenarioIds = manifest.scenarios.map((scenario) => scenario.id);

    expect(manifest.scenarios.length).toBeGreaterThanOrEqual(12);
    expect(scenarioIds).toContain("fresh-install-flow");
    expect(scenarioIds).toContain("first-run-help-flow");
    expect(scenarioIds).toContain("continuation-happy-path");
  });

  test("builds direct opencode argv rather than a shell command string", () => {
    expect(buildLiveHarnessCommand({ prompt: "hello" })).toEqual({
      executable: "opencode",
        args: ["run", "--print-logs", "hello"],
      });
  });

  test("builds continuation commands with --continue for follow-up turns", () => {
    expect(buildLiveHarnessCommand({ prompt: "continue", continueSession: true })).toEqual({
      executable: "opencode",
      args: ["run", "--print-logs", "--continue", "continue"],
    });
  });

  test("skips cleanly when live mode env is disabled", async () => {
    let executed = false;

    const result = await runLiveHarness({
      manifestPath,
      env: {},
      exec: async () => {
        executed = true;
        return { stdout: "", stderr: "", exitCode: 0 };
      },
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("OPENCODE_LIVE=1");
    expect(result.summary.passed).toBe(0);
    expect(result.summary.failed).toBe(0);
    expect(executed).toBe(false);
  });

  test("constructs opencode run commands with --print-logs and continuation flags", async () => {
    const customManifestPath = await writeManifest({
      scenarios: [
        {
          id: "continuation",
          turns: [
            {
              prompt: "bootstrap",
              expect: {
                valid: true,
                selectedProcessSkill: "plan",
                stages: ["bootstrap", "process-skill", "plan-ready"],
              },
            },
            {
              prompt: "continue",
              expect: {
                valid: true,
                selectedProcessSkill: "plan",
                stages: ["bootstrap", "process-skill", "plan-ready"],
              },
            },
          ],
        },
      ],
    });
    const commands: LiveHarnessCommand[] = [];

    await runLiveHarness({
      manifestPath: customManifestPath,
      env: { OPENCODE_LIVE: "1" },
      exec: async (command) => {
        commands.push(command);
        return {
          stdout: `[bootstrap] plugin=.opencode/plugins/imitation-machine.js\n[bootstrap] service=skill initialized\n[skill] using-agentic loaded\n[route] selected process skill: plan\n[state] plan-ready\n`,
          stderr: "",
          exitCode: 0,
        };
      },
    });

    expect(commands).toEqual([
      {
        executable: "opencode",
        args: ["run", "--print-logs", "bootstrap"],
      },
      {
        executable: "opencode",
        args: ["run", "--print-logs", "--continue", "continue"],
      },
    ]);
  });

  test("fails when a scenario-level raw transcript substring is missing", async () => {
    const customManifestPath = await writeManifest({
      scenarios: [
        {
          id: "missing-raw-substring",
          prompt: "help me get started",
          rawTranscriptIncludes: ["agentic verify all"],
          expect: {
            valid: true,
            selectedProcessSkill: "plan",
            stages: ["bootstrap", "process-skill", "plan-ready"],
          },
        },
      ],
    });

    const result = await runLiveHarness({
      manifestPath: customManifestPath,
      env: { OPENCODE_LIVE: "1" },
      exec: async () => ({
        stdout:
          `[bootstrap] plugin=.opencode/plugins/imitation-machine.js\n` +
          `[bootstrap] service=skill initialized\n` +
          `[skill] using-agentic loaded\n` +
          `[route] selected process skill: plan\n` +
          `[state] plan-ready\n`,
        stderr: "",
        exitCode: 0,
      }),
    });

    expect(result.summary.failed).toBe(1);
    expect(result.results[0]?.failureReasons).toEqual(
      expect.arrayContaining([
        "Missing raw transcript substring: agentic verify all",
      ]),
    );
  });

  test("rejects non-string rawTranscriptIncludes entries at manifest load time", async () => {
    const customManifestPath = await writeManifest({
      scenarios: [
        {
          id: "durable-anchor-check",
          prompt: "help me get started",
          rawTranscriptIncludes: [["using-agentic", "tdd", "agentic verify all"]],
          expect: {
            valid: true,
            selectedProcessSkill: "plan",
            stages: ["bootstrap", "process-skill", "plan-ready"],
          },
        },
      ],
    });

    await expect(loadLiveScenarioManifest(customManifestPath)).rejects.toThrow(
      "Scenario durable-anchor-check has invalid rawTranscriptIncludes[0]: expected string",
    );
  });

  test("rejects non-array rawTranscriptIncludes at manifest load time", async () => {
    const customManifestPath = await writeManifest({
      scenarios: [
        {
          id: "durable-anchor-shape-check",
          prompt: "help me get started",
          rawTranscriptIncludes: "agentic verify all",
          expect: {
            valid: true,
            selectedProcessSkill: "plan",
            stages: ["bootstrap", "process-skill", "plan-ready"],
          },
        },
      ],
    });

    await expect(loadLiveScenarioManifest(customManifestPath)).rejects.toThrow(
      "Scenario durable-anchor-shape-check has invalid rawTranscriptIncludes: expected array",
    );
  });

  test("evaluates live transcripts with existing OpenCode harness semantics", async () => {
    const manifest = await loadLiveScenarioManifest(manifestPath);
    const missingBootstrapTranscript = await Bun.file(
      "tests/harness-fixtures/opencode-missing-bootstrap.log",
    ).text();
    const wrongProcessSkillTranscript = await Bun.file(
      "tests/harness-fixtures/opencode-wrong-process-skill.log",
    ).text();
    const staleVerificationTranscript = await Bun.file(
      "tests/harness-fixtures/opencode-stale-verification-evidence.log",
    ).text();
    const contradictoryAgentOutputsTranscript = await Bun.file(
      "tests/harness-fixtures/opencode-contradictory-agent-outputs.log",
    ).text();
    const continuationHappyTranscript = await Bun.file(
      "tests/harness-fixtures/opencode-continuation-happy.log",
    ).text();
    const continuationStaleVerificationTranscript = await Bun.file(
      "tests/harness-fixtures/opencode-continuation-stale-verification.log",
    ).text();
    const transcripts = new Map([
      [
        "fresh-install-flow",
        `[bootstrap] plugin=.opencode/plugins/imitation-machine.js\n[bootstrap] service=skill initialized\n[skill] using-agentic loaded\n[route] selected process skill: plan\n[state] plan-ready\nOpenCode install path: agentic install local --surface opencode\nThen check the mode with: agentic mode show\nBefore calling it done, run: agentic verify all\n`,
      ],
      [
        "first-run-help-flow",
        `[bootstrap] plugin=.opencode/plugins/imitation-machine.js\n[bootstrap] service=skill initialized\n[skill] using-agentic loaded\n[route] selected process skill: plan\n[state] plan-ready\nStart with using-agentic, then choose the matching workflow skill like plan or tdd.\nFinish with fresh verification: agentic verify all\n`,
      ],
      [
        "mode-discovery-flow",
        `[bootstrap] plugin=.opencode/plugins/imitation-machine.js\n[bootstrap] service=skill initialized\n[skill] using-agentic loaded\n[route] selected process skill: plan\n[state] plan-ready\nResolved mode: standard\nSource: built-in fallback (no override or valid repo config)\nTip: run \`agentic mode show\`\n`,
      ],
      [
        "mode-confusion-recovery",
        `[bootstrap] plugin=.opencode/plugins/imitation-machine.js\n[bootstrap] service=skill initialized\n[skill] using-agentic loaded\n[route] selected process skill: plan\n[state] plan-ready\nproject override > repo config > fallback standard\nTo change it: agentic mode lite|standard|strict [--cwd <path>]\nTo revert to the repo default or fallback: agentic mode clear [--cwd <path>]\n`,
      ],
      [
        "bootstrap-plan-ready",
        `[bootstrap] plugin=.opencode/plugins/imitation-machine.js\n[bootstrap] service=skill initialized\n[skill] using-agentic loaded\n[route] selected process skill: plan\n[state] plan-ready\n`,
      ],
      [
        "missing-process-skill",
        `[bootstrap] plugin=.opencode/plugins/imitation-machine.js\n[bootstrap] service=skill initialized\n[skill] using-agentic loaded\n[state] plan-ready\n`,
      ],
      [
        "missing-bootstrap",
        missingBootstrapTranscript,
      ],
      [
        "wrong-process-skill",
        wrongProcessSkillTranscript,
      ],
      [
        "stale-verification-evidence",
        staleVerificationTranscript,
      ],
      [
        "contradictory-agent-outputs",
        contradictoryAgentOutputsTranscript,
      ],
      [
        "continuation-happy-path:0",
        `[bootstrap] plugin=.opencode/plugins/imitation-machine.js\n[bootstrap] service=skill initialized\n[skill] using-agentic loaded\n[route] selected process skill: plan\n[state] plan-ready\n`,
      ],
      ["continuation-happy-path:1", continuationHappyTranscript],
      [
        "continuation-stale-verification:0",
        `[bootstrap] plugin=.opencode/plugins/imitation-machine.js\n[bootstrap] service=skill initialized\n[skill] using-agentic loaded\n[route] selected process skill: plan\n[state] plan-ready\n`,
      ],
      ["continuation-stale-verification:1", continuationStaleVerificationTranscript],
    ]);

    const result = await runLiveHarness({
      manifestPath,
      env: { OPENCODE_LIVE: "1" },
      exec: async (_command, scenario, turn) => {

        return {
          stdout: transcripts.get(`${scenario.id}:${turn.index}`) ?? transcripts.get(scenario.id) ?? "",
          stderr: "",
          exitCode: 0,
        };
      },
    });
    const resultsById = getResultsById(result);

    expect(result.skipped).toBe(false);
    expect(result.summary.passed).toBe(manifest.scenarios.length);
    expect(result.summary.failed).toBe(0);
    expect(result.results).toHaveLength(manifest.scenarios.length);
    expect(result.results.map((scenario) => scenario.id).sort()).toEqual(
      manifest.scenarios.map((scenario) => scenario.id).sort(),
    );
    expect(resultsById.get("fresh-install-flow")).toMatchObject({
      id: "fresh-install-flow",
      ok: true,
      evaluation: {
        valid: true,
        selectedProcessSkill: "plan",
        stages: ["bootstrap", "process-skill", "plan-ready"],
      },
    });
    expect(resultsById.get("first-run-help-flow")).toMatchObject({
      id: "first-run-help-flow",
      ok: true,
      evaluation: {
        valid: true,
        selectedProcessSkill: "plan",
        stages: ["bootstrap", "process-skill", "plan-ready"],
      },
    });
    expect(resultsById.get("mode-discovery-flow")).toMatchObject({
      id: "mode-discovery-flow",
      ok: true,
      evaluation: {
        valid: true,
        selectedProcessSkill: "plan",
        stages: ["bootstrap", "process-skill", "plan-ready"],
      },
    });
    expect(resultsById.get("mode-confusion-recovery")).toMatchObject({
      id: "mode-confusion-recovery",
      ok: true,
      evaluation: {
        valid: true,
        selectedProcessSkill: "plan",
        stages: ["bootstrap", "process-skill", "plan-ready"],
      },
    });
    expect(resultsById.get("bootstrap-plan-ready")).toMatchObject({
      id: "bootstrap-plan-ready",
      ok: true,
      evaluation: {
        valid: true,
        selectedProcessSkill: "plan",
        stages: ["bootstrap", "process-skill", "plan-ready"],
      },
    });
    expect(resultsById.get("missing-process-skill")).toMatchObject({
      id: "missing-process-skill",
      ok: true,
      evaluation: {
        valid: false,
        selectedProcessSkill: null,
        issues: ["Missing process-skill selection"],
      },
    });
    expect(resultsById.get("missing-bootstrap")).toMatchObject({
      id: "missing-bootstrap",
      ok: true,
      evaluation: {
        valid: false,
        selectedProcessSkill: "plan",
        issues: [
          "Missing bootstrap evidence: [bootstrap] plugin=.opencode/plugins/imitation-machine.js; [bootstrap] service=skill initialized; [skill] using-agentic loaded",
        ],
      },
    });
    expect(resultsById.get("wrong-process-skill")).toMatchObject({
      id: "wrong-process-skill",
      ok: true,
      evaluation: {
        valid: false,
        selectedProcessSkill: "plan",
        issues: ["Wrong process skill loaded: expected plan, loaded brainstorm"],
      },
    });
    expect(resultsById.get("stale-verification-evidence")).toMatchObject({
      id: "stale-verification-evidence",
      ok: true,
      evaluation: {
        valid: false,
        selectedProcessSkill: "plan",
        issues: [
          "Stale verification evidence: [verify] evidence source=previous-run age=2h command=bun test",
        ],
      },
    });
    expect(resultsById.get("contradictory-agent-outputs")).toMatchObject({
      id: "contradictory-agent-outputs",
      ok: true,
      evaluation: {
        valid: false,
        selectedProcessSkill: "plan",
        issues: [
          "Contradictory agent outputs: [agent:coder] status: DONE; [agent:reviewer] status: BLOCKED",
        ],
      },
    });
    expect(resultsById.get("continuation-happy-path")).toMatchObject({
      id: "continuation-happy-path",
      ok: true,
      turns: [
        {
          index: 0,
          ok: true,
          command: {
            args: [
              "run",
              "--print-logs",
              "Start from bootstrap, route through the right process skill, and end at a plan-ready state.",
            ],
          },
        },
        {
          index: 1,
          ok: true,
          command: {
            args: [
              "run",
              "--print-logs",
              "--continue",
              "Continue the same session, keep the prior plan context carried forward, and show fresh current-run verification while staying plan-ready.",
            ],
          },
          evaluation: {
            valid: true,
            selectedProcessSkill: "plan",
            stages: ["bootstrap", "process-skill", "plan-ready"],
          },
        },
      ],
    });
    expect(resultsById.get("continuation-stale-verification")).toMatchObject({
      id: "continuation-stale-verification",
      ok: true,
      turns: [
        {
          index: 0,
          ok: true,
        },
        {
          index: 1,
          ok: true,
          evaluation: {
            valid: false,
            selectedProcessSkill: "plan",
            issues: [
              "Stale verification evidence: [verify] evidence source=previous-run age=2h command=bun test",
            ],
          },
        },
      ],
      evaluation: {
        valid: false,
      },
    });
  });

  test("marks executions that time out as failures", async () => {
    const manifest = await loadLiveScenarioManifest(manifestPath);
    const result = await runLiveHarness({
      manifestPath,
      env: { OPENCODE_LIVE: "1" },
      exec: async () => ({
        stdout: "",
        stderr: "timed out",
        exitCode: 124,
      }),
    });

    expect(result.skipped).toBe(false);
    expect(result.summary.failed).toBe(manifest.scenarios.length);
    expect(result.results[0]?.failureReasons).toEqual(
      expect.arrayContaining([expect.stringContaining("code 124")]),
    );
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
                selectedProcessSkill: "plan",
                stages: ["bootstrap", "process-skill", "plan-ready"],
              },
            },
            {
              prompt: "continue",
              expect: {
                valid: false,
                selectedProcessSkill: "plan",
                stages: ["bootstrap", "process-skill", "plan-ready"],
                issues: [
                  "Stale verification evidence: [verify] evidence source=previous-run age=2h command=bun test",
                ],
              },
            },
          ],
        },
      ],
    });

    const result = await runLiveHarness({
      manifestPath: customManifestPath,
      env: { OPENCODE_LIVE: "1" },
      exec: async (_command, _scenario, turn) => ({
        stdout:
          turn.index === 0
            ? `[bootstrap] plugin=.opencode/plugins/imitation-machine.js\n[bootstrap] service=skill initialized\n[skill] using-agentic loaded\n[route] selected process skill: plan\n[state] plan-ready\n`
            : `[state] plan-ready\n`,
        stderr: "",
        exitCode: 0,
      }),
    });

    expect(result.summary.failed).toBe(1);
    expect(result.results[0]?.failureReasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Turn 2: Expected valid=false, received valid=true"),
        expect.stringContaining(
          "Turn 2: Missing expected issue: Stale verification evidence: [verify] evidence source=previous-run age=2h command=bun test",
        ),
      ]),
    );
  });

  test("fails when evaluation reports unexpected extra issues", async () => {
    const customManifestPath = await writeManifest({
      scenarios: [
        {
          id: "extra-issues",
          prompt: "check recovery path",
          expect: {
            valid: false,
            stages: ["bootstrap"],
            issues: ["Missing process-skill selection"],
          },
        },
      ],
    });

    const result = await runLiveHarness({
      manifestPath: customManifestPath,
      env: { OPENCODE_LIVE: "1" },
      exec: async () => ({
        stdout:
          `[bootstrap] plugin=.opencode/plugins/imitation-machine.js\n` +
          `[bootstrap] service=skill initialized\n` +
          `[skill] using-agentic loaded\n` +
          `[state] plan-ready\n` +
          `[agent:coder] status: DONE\n` +
          `[agent:reviewer] status: BLOCKED\n`,
        stderr: "",
        exitCode: 0,
      }),
    });

    expect(result.summary.failed).toBe(1);
    expect(result.results[0]?.failureReasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "Unexpected issues: Contradictory agent outputs: [agent:coder] status: DONE; [agent:reviewer] status: BLOCKED",
        ),
      ]),
    );
  });

  test("clears the timeout when the process exits before it fires", async () => {
    const customManifestPath = await writeManifest({
      scenarios: [
        {
          id: "fast-exit",
          prompt: "bootstrap",
          expect: {
            valid: true,
            selectedProcessSkill: "plan",
            stages: ["bootstrap", "process-skill", "plan-ready"],
          },
        },
      ],
    });

    const originalSpawn = Bun.spawn;
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    const clearTimeoutCalls: unknown[] = [];
    const timerToken = 1;
    const mockSetTimeout = ((
      _handler: TimerHandler,
      _timeout?: number,
      ..._arguments: unknown[]
    ) => timerToken) as unknown as typeof setTimeout;
    const mockProcess = {
      stdout: new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              `[bootstrap] plugin=.opencode/plugins/imitation-machine.js\n` +
                `[bootstrap] service=skill initialized\n` +
                `[skill] using-agentic loaded\n` +
                `[route] selected process skill: plan\n` +
                `[state] plan-ready\n`,
            ),
          );
          controller.close();
        },
      }),
      stderr: new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
      exited: Promise.resolve(0),
      kill() {},
    } as unknown as ReturnType<typeof Bun.spawn>;
    const mockSpawn: typeof Bun.spawn = (..._arguments) => mockProcess;

    try {
      globalThis.setTimeout = mockSetTimeout;
      globalThis.clearTimeout = ((timer: unknown) => {
        clearTimeoutCalls.push(timer);
      }) as typeof clearTimeout;
      Bun.spawn = mockSpawn;

      const result = await runLiveHarness({
        manifestPath: customManifestPath,
        env: { OPENCODE_LIVE: "1" },
      });

      expect(result.summary.passed).toBe(1);
      expect(clearTimeoutCalls).toEqual([timerToken]);
    } finally {
      Bun.spawn = originalSpawn;
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    }
  });
});
