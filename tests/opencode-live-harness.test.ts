import { describe, expect, test } from "bun:test";
import {
  buildLiveHarnessCommand,
  loadLiveScenarioManifest,
  runLiveHarness,
  type LiveHarnessCommand,
} from "../scripts/opencode-live-harness";

const manifestPath = new URL("./opencode/live-scenarios.json", import.meta.url).pathname;

describe("OpenCode live harness", () => {
  test("loads the checked-in live scenario manifest", async () => {
    const manifest = await loadLiveScenarioManifest(manifestPath);

    expect(manifest.scenarios.length).toBeGreaterThanOrEqual(2);
    expect(manifest.scenarios.map((scenario) => scenario.id)).toEqual([
      "bootstrap-plan-ready",
      "missing-process-skill",
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
    const transcripts = new Map([
      [
        "bootstrap-plan-ready",
        `[bootstrap] plugin=.opencode/plugins/imitation-machine.js\n[bootstrap] service=skill initialized\n[skill] using-agentic loaded\n[route] selected process skill: plan\n[state] plan-ready\n`,
      ],
      [
        "missing-process-skill",
        `[bootstrap] plugin=.opencode/plugins/imitation-machine.js\n[bootstrap] service=skill initialized\n[skill] using-agentic loaded\n[state] plan-ready\n`,
      ],
    ]);

    const result = await runLiveHarness({
      manifestPath,
      env: { OPENCODE_LIVE: "1" },
      exec: async (command) => {
        const prompt = command.args.at(-1) ?? "";
        const scenario = prompt.includes("ambiguous")
          ? "missing-process-skill"
          : "bootstrap-plan-ready";

        return {
          stdout: transcripts.get(scenario) ?? "",
          stderr: "",
          exitCode: 0,
        };
      },
    });

    expect(result.skipped).toBe(false);
    expect(result.summary.passed).toBe(2);
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
    expect(result.summary.failed).toBe(2);
    expect(result.results[0]?.failureReasons).toEqual(
      expect.arrayContaining([expect.stringContaining("code 124")]),
    );
  });
});
