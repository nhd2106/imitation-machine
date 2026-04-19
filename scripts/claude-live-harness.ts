import {
  evaluateClaudeTranscript,
  type ClaudeStage,
  type ClaudeTranscriptResult,
} from "./claude-code-harness";

export type ClaudeLiveScenarioExpectation = {
  valid: boolean;
  workflowRoute?: ClaudeTranscriptResult["workflowRoute"];
  stages?: ClaudeStage[];
  issues?: string[];
};

export type ClaudeLiveScenarioTurn = {
  prompt: string;
  expect: ClaudeLiveScenarioExpectation;
};

export type ClaudeLiveScenario = {
  id: string;
  prompt?: string;
  expect?: ClaudeLiveScenarioExpectation;
  turns?: ClaudeLiveScenarioTurn[];
};

export type ClaudeLiveScenarioManifest = {
  scenarios: ClaudeLiveScenario[];
};

export type ClaudeLiveHarnessExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type ClaudeLiveHarnessCommand = {
  executable: string;
  args: string[];
};

export type ClaudeLiveHarnessTurnResult = {
  index: number;
  prompt: string;
  command: ClaudeLiveHarnessCommand;
  ok: boolean;
  evaluation: ClaudeTranscriptResult;
  failureReasons: string[];
  exitCode: number;
  stderr: string;
};

export type ClaudeLiveHarnessScenarioResult = {
  id: string;
  ok: boolean;
  evaluation: ClaudeTranscriptResult;
  failureReasons: string[];
  turns: ClaudeLiveHarnessTurnResult[];
};

export type ClaudeLiveHarnessRunResult = {
  skipped: boolean;
  reason?: string;
  results: ClaudeLiveHarnessScenarioResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
};

type RunClaudeLiveHarnessOptions = {
  manifestPath?: string;
  env?: Record<string, string | undefined>;
  exec?: (
    command: ClaudeLiveHarnessCommand,
    scenario: ClaudeLiveScenario,
    turn: ClaudeLiveScenarioExecutionTurn,
  ) => Promise<ClaudeLiveHarnessExecResult>;
};

type ClaudeLiveScenarioExecutionTurn = ClaudeLiveScenarioTurn & {
  index: number;
  continueSession: boolean;
};

const DEFAULT_MANIFEST_PATH = new URL("../tests/claude-code/live-scenarios.json", import.meta.url)
  .pathname;

const DEFAULT_TIMEOUT_MS = 30_000;

function isLiveEnabled(env: Record<string, string | undefined>): boolean {
  return env.CLAUDE_LIVE === "1";
}

function compareExpectations(
  evaluation: ClaudeTranscriptResult,
  expectation: ClaudeLiveScenarioExpectation,
): string[] {
  const failureReasons: string[] = [];

  if (evaluation.valid !== expectation.valid) {
    failureReasons.push(`Expected valid=${expectation.valid}, received valid=${evaluation.valid}`);
  }

  if (
    expectation.workflowRoute !== undefined &&
    evaluation.workflowRoute !== expectation.workflowRoute
  ) {
    failureReasons.push(
      `Expected workflowRoute=${expectation.workflowRoute}, received ${evaluation.workflowRoute}`,
    );
  }

  if (expectation.stages && JSON.stringify(evaluation.stages) !== JSON.stringify(expectation.stages)) {
    failureReasons.push(
      `Expected stages=${expectation.stages.join(",")}, received ${evaluation.stages.join(",")}`,
    );
  }

  for (const issue of expectation.issues ?? []) {
    if (!evaluation.issues.includes(issue)) {
      failureReasons.push(`Missing expected issue: ${issue}`);
    }
  }

  const unexpectedIssues = evaluation.issues.filter((issue) => !(expectation.issues ?? []).includes(issue));
  if (unexpectedIssues.length > 0) {
    failureReasons.push(`Unexpected issues: ${unexpectedIssues.join(", ")}`);
  }

  return failureReasons;
}

function getScenarioTurns(scenario: ClaudeLiveScenario): ClaudeLiveScenarioExecutionTurn[] {
  if (scenario.turns && scenario.turns.length > 0) {
    return scenario.turns.map((turn, index) => ({
      ...turn,
      index,
      continueSession: index > 0,
    }));
  }

  if (!scenario.prompt || !scenario.expect) {
    throw new Error(`Scenario ${scenario.id} must provide either prompt/expect or turns[].`);
  }

  return [
    {
      index: 0,
      prompt: scenario.prompt,
      expect: scenario.expect,
      continueSession: false,
    },
  ];
}

export function buildClaudeLiveHarnessCommand({
  prompt,
  continueSession = false,
}: {
  prompt: string;
  continueSession?: boolean;
}): ClaudeLiveHarnessCommand {
  return {
    executable: "claude",
    args: ["--print", ...(continueSession ? ["--continue"] : []), prompt],
  };
}

async function defaultExec(command: ClaudeLiveHarnessCommand): Promise<ClaudeLiveHarnessExecResult> {
  const proc = Bun.spawn([command.executable, ...command.args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<number>((resolve) => {
    timer = setTimeout(() => {
      try {
        proc.kill();
      } catch {
        // Process may already be gone.
      }
      clearTimeout(timer);
      resolve(124);
    }, DEFAULT_TIMEOUT_MS);
  });

  const exited = proc.exited.then((exitCode: number) => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }

    return exitCode;
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    Promise.race([exited, timeout]),
  ]);

  return { stdout, stderr, exitCode };
}

export async function loadClaudeLiveScenarioManifest(
  manifestPath = DEFAULT_MANIFEST_PATH,
): Promise<ClaudeLiveScenarioManifest> {
  return (await Bun.file(manifestPath).json()) as ClaudeLiveScenarioManifest;
}

export async function runClaudeLiveHarness({
  manifestPath = DEFAULT_MANIFEST_PATH,
  env = process.env,
  exec = defaultExec,
}: RunClaudeLiveHarnessOptions = {}): Promise<ClaudeLiveHarnessRunResult> {
  const manifest = await loadClaudeLiveScenarioManifest(manifestPath);

  if (!isLiveEnabled(env)) {
    return {
      skipped: true,
      reason: "Set CLAUDE_LIVE=1 to enable Claude live scenarios.",
      results: [],
      summary: {
        total: manifest.scenarios.length,
        passed: 0,
        failed: 0,
      },
    };
  }

  const results: ClaudeLiveHarnessScenarioResult[] = [];

  for (const scenario of manifest.scenarios) {
    let transcript = "";
    const turns = getScenarioTurns(scenario);
    const turnResults: ClaudeLiveHarnessTurnResult[] = [];

    for (const turn of turns) {
      const command = buildClaudeLiveHarnessCommand({
        prompt: turn.prompt,
        continueSession: turn.continueSession,
      });
      const execution = await exec(command, scenario, turn);
      transcript = transcript ? `${transcript}\n${execution.stdout}` : execution.stdout;
      const evaluation = evaluateClaudeTranscript(transcript);
      const failureReasons = [
        ...(execution.exitCode === 0 ? [] : [`Command exited with code ${execution.exitCode}`]),
        ...compareExpectations(evaluation, turn.expect),
      ];

      turnResults.push({
        index: turn.index,
        prompt: turn.prompt,
        command,
        ok: failureReasons.length === 0,
        evaluation,
        failureReasons,
        exitCode: execution.exitCode,
        stderr: execution.stderr,
      });
    }

    const failureReasons = turnResults.flatMap((turn) =>
      turn.failureReasons.map((reason) => `Turn ${turn.index + 1}: ${reason}`),
    );
    const evaluation = turnResults.at(-1)?.evaluation ?? evaluateClaudeTranscript("");

    results.push({
      id: scenario.id,
      ok: failureReasons.length === 0,
      evaluation,
      failureReasons,
      turns: turnResults,
    });
  }

  return {
    skipped: false,
    results,
    summary: {
      total: results.length,
      passed: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
    },
  };
}

async function main() {
  const result = await runClaudeLiveHarness();

  if (result.skipped) {
    console.log(`[claude-live] skipped: ${result.reason}`);
    return;
  }

  for (const scenario of result.results) {
    console.log(`[claude-live] ${scenario.ok ? "PASS" : "FAIL"} ${scenario.id}`);
    for (const turn of scenario.turns) {
      console.log(
        `[claude-live]   turn ${turn.index + 1}: ${turn.command.executable} ${turn.command.args.join(" ")}`,
      );
    }

    if (!scenario.ok) {
      for (const reason of scenario.failureReasons) {
        console.log(`[claude-live]   ${reason}`);
      }
    }
  }

  console.log(
    `[claude-live] summary: ${result.summary.passed} passed, ${result.summary.failed} failed, ${result.summary.total} total`,
  );

  if (result.summary.failed > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
