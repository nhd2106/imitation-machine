import { evaluateOpenCodeTranscript, type OpenCodeStage, type OpenCodeTranscriptResult } from "./opencode-harness";

export type LiveScenarioExpectation = {
  valid: boolean;
  selectedProcessSkill?: OpenCodeTranscriptResult["selectedProcessSkill"];
  stages?: OpenCodeStage[];
  issues?: string[];
};

export type LiveScenario = {
  id: string;
  prompt: string;
  expect: LiveScenarioExpectation;
};

export type LiveScenarioManifest = {
  scenarios: LiveScenario[];
};

export type LiveHarnessExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type LiveHarnessCommand = {
  executable: string;
  args: string[];
};

export type LiveHarnessScenarioResult = {
  id: string;
  command: LiveHarnessCommand;
  ok: boolean;
  evaluation: OpenCodeTranscriptResult;
  failureReasons: string[];
  exitCode: number;
  stderr: string;
};

export type LiveHarnessRunResult = {
  skipped: boolean;
  reason?: string;
  results: LiveHarnessScenarioResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
};

type RunLiveHarnessOptions = {
  manifestPath?: string;
  env?: Record<string, string | undefined>;
  exec?: (command: LiveHarnessCommand, scenario: LiveScenario) => Promise<LiveHarnessExecResult>;
};

const DEFAULT_MANIFEST_PATH = new URL("../tests/opencode/live-scenarios.json", import.meta.url)
  .pathname;

function isLiveEnabled(env: Record<string, string | undefined>): boolean {
  return env.OPENCODE_LIVE === "1";
}

function compareExpectations(
  evaluation: OpenCodeTranscriptResult,
  expectation: LiveScenarioExpectation,
): string[] {
  const failureReasons: string[] = [];

  if (evaluation.valid !== expectation.valid) {
    failureReasons.push(
      `Expected valid=${expectation.valid}, received valid=${evaluation.valid}`,
    );
  }

  if (
    expectation.selectedProcessSkill !== undefined &&
    evaluation.selectedProcessSkill !== expectation.selectedProcessSkill
  ) {
    failureReasons.push(
      `Expected selectedProcessSkill=${expectation.selectedProcessSkill}, received ${evaluation.selectedProcessSkill}`,
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

const DEFAULT_TIMEOUT_MS = 30_000;

export function buildLiveHarnessCommand({ prompt }: { prompt: string }): LiveHarnessCommand {
  return {
    executable: "opencode",
    args: ["run", "--print-logs", prompt],
  };
}

async function defaultExec(command: LiveHarnessCommand): Promise<LiveHarnessExecResult> {
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

  return {
    stdout,
    stderr,
    exitCode,
  };
}

export async function loadLiveScenarioManifest(
  manifestPath = DEFAULT_MANIFEST_PATH,
): Promise<LiveScenarioManifest> {
  return (await Bun.file(manifestPath).json()) as LiveScenarioManifest;
}

export async function runLiveHarness({
  manifestPath = DEFAULT_MANIFEST_PATH,
  env = process.env,
  exec = defaultExec,
}: RunLiveHarnessOptions = {}): Promise<LiveHarnessRunResult> {
  const manifest = await loadLiveScenarioManifest(manifestPath);

  if (!isLiveEnabled(env)) {
    return {
      skipped: true,
      reason: "Set OPENCODE_LIVE=1 to enable OpenCode live scenarios.",
      results: [],
      summary: {
        total: manifest.scenarios.length,
        passed: 0,
        failed: 0,
      },
    };
  }

  const results: LiveHarnessScenarioResult[] = [];

  for (const scenario of manifest.scenarios) {
    const command = buildLiveHarnessCommand({ prompt: scenario.prompt });
    const execution = await exec(command, scenario);
    const evaluation = evaluateOpenCodeTranscript(execution.stdout);
    const failureReasons = [
      ...(execution.exitCode === 0
        ? []
        : [`Command exited with code ${execution.exitCode}`]),
      ...compareExpectations(evaluation, scenario.expect),
    ];

    results.push({
      id: scenario.id,
      command,
      ok: failureReasons.length === 0,
      evaluation,
      failureReasons,
      exitCode: execution.exitCode,
      stderr: execution.stderr,
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
  const result = await runLiveHarness();

  if (result.skipped) {
    console.log(`[opencode-live] skipped: ${result.reason}`);
    return;
  }

  for (const scenario of result.results) {
    console.log(`[opencode-live] ${scenario.ok ? "PASS" : "FAIL"} ${scenario.id}`);
    console.log(
      `[opencode-live]   command: ${scenario.command.executable} ${scenario.command.args.join(" ")}`,
    );

    if (!scenario.ok) {
      for (const reason of scenario.failureReasons) {
        console.log(`[opencode-live]   ${reason}`);
      }
    }
  }

  console.log(
    `[opencode-live] summary: ${result.summary.passed} passed, ${result.summary.failed} failed, ${result.summary.total} total`,
  );

  if (result.summary.failed > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
