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

describe("OpenCode live harness", () => {
  test("loads the checked-in live scenario manifest", async () => {
    const manifest = await loadLiveScenarioManifest(manifestPath);

    expect(manifest.scenarios.length).toBeGreaterThanOrEqual(6);
    expect(manifest.scenarios.map((scenario) => scenario.id)).toEqual([
      "bootstrap-plan-ready",
      "missing-process-skill",
      "missing-bootstrap",
      "wrong-process-skill",
      "stale-verification-evidence",
      "contradictory-agent-outputs",
    ]);
  });

  test("builds direct opencode argv rather than a shell command string", () => {
    expect(buildLiveHarnessCommand({ prompt: "hello" })).toEqual({
      executable: "opencode",
      args: ["run", "--print-logs", "hello"],
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

  test("constructs opencode run commands with --print-logs", async () => {
    const commands: LiveHarnessCommand[] = [];

    await runLiveHarness({
      manifestPath,
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

    expect(commands[0]).toEqual(
      expect.objectContaining({
        executable: "opencode",
        args: expect.arrayContaining(["run", "--print-logs"]),
      }),
    );
    expect(commands[0]?.args.at(-1)).toContain("bootstrap");
  });

  test("evaluates live transcripts with existing OpenCode harness semantics", async () => {
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
    const transcripts = new Map([
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
    ]);

    const result = await runLiveHarness({
      manifestPath,
      env: { OPENCODE_LIVE: "1" },
      exec: async (_command, scenario) => {

        return {
          stdout: transcripts.get(scenario.id) ?? "",
          stderr: "",
          exitCode: 0,
        };
      },
    });

    expect(result.skipped).toBe(false);
    expect(result.summary.passed).toBe(6);
    expect(result.summary.failed).toBe(0);
    expect(result.results).toEqual([
      expect.objectContaining({
        id: "bootstrap-plan-ready",
        ok: true,
        evaluation: expect.objectContaining({
          valid: true,
          selectedProcessSkill: "plan",
          stages: ["bootstrap", "process-skill", "plan-ready"],
        }),
      }),
      expect.objectContaining({
        id: "missing-process-skill",
        ok: true,
        command: expect.objectContaining({
          executable: "opencode",
          args: expect.arrayContaining(["run", "--print-logs"]),
        }),
        evaluation: expect.objectContaining({
          valid: false,
          selectedProcessSkill: null,
          issues: expect.arrayContaining(["Missing process-skill selection"]),
        }),
      }),
      expect.objectContaining({
        id: "missing-bootstrap",
        ok: true,
        evaluation: expect.objectContaining({
          valid: false,
          selectedProcessSkill: "plan",
          issues: expect.arrayContaining([
            "Missing bootstrap evidence: [bootstrap] plugin=.opencode/plugins/imitation-machine.js; [bootstrap] service=skill initialized; [skill] using-agentic loaded",
          ]),
        }),
      }),
      expect.objectContaining({
        id: "wrong-process-skill",
        ok: true,
        evaluation: expect.objectContaining({
          valid: false,
          selectedProcessSkill: "plan",
          issues: expect.arrayContaining([
            "Wrong process skill loaded: expected plan, loaded brainstorm",
          ]),
        }),
      }),
      expect.objectContaining({
        id: "stale-verification-evidence",
        ok: true,
        evaluation: expect.objectContaining({
          valid: false,
          selectedProcessSkill: "plan",
          issues: expect.arrayContaining([
            "Stale verification evidence: [verify] evidence source=previous-run age=2h command=bun test",
          ]),
        }),
      }),
      expect.objectContaining({
        id: "contradictory-agent-outputs",
        ok: true,
        evaluation: expect.objectContaining({
          valid: false,
          selectedProcessSkill: "plan",
          issues: expect.arrayContaining([
            "Contradictory agent outputs: [agent:coder] status: DONE; [agent:reviewer] status: BLOCKED",
          ]),
        }),
      }),
    ]);
  });

  test("marks executions that time out as failures", async () => {
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
    expect(result.summary.failed).toBe(6);
    expect(result.results[0]?.failureReasons).toEqual(
      expect.arrayContaining([expect.stringContaining("code 124")]),
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
