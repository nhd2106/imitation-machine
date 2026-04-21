import { join } from "node:path";
import {
  scaffoldExecutableWorkflowHarness,
  type ExecutableWorkflowHarnessConfig,
  type ExecutableWorkflowScaffold,
} from "./executable-workflow-harness";

export type OpenCodeInstalledLiveStage =
  | "install-visible-skills"
  | "workflow-routing"
  | "plan-approved"
  | "implementation-written"
  | "review-spec-passed"
  | "review-quality-passed"
  | "verification-fresh"
  | "review-ready";

export type OpenCodeInstalledLiveTranscriptResult = {
  valid: boolean;
  workflowRoute: string | null;
  stages: OpenCodeInstalledLiveStage[];
  issues: string[];
};

export type OpenCodeInstalledLiveScenarioExpectation = {
  valid: boolean;
  workflowRoute?: string;
  stages?: OpenCodeInstalledLiveStage[];
  issues?: string[];
};

export type OpenCodeInstalledLiveScenarioTurn = {
  prompt: string;
  expect: OpenCodeInstalledLiveScenarioExpectation;
};

export type OpenCodeInstalledLiveScenario = {
  id: string;
  prompt?: string;
  expect?: OpenCodeInstalledLiveScenarioExpectation;
  turns?: OpenCodeInstalledLiveScenarioTurn[];
  scaffold: {
    archetype: "docs-review";
    planId: string;
    taskId: string;
  };
};

export type OpenCodeInstalledLiveScenarioManifest = {
  scenarios: OpenCodeInstalledLiveScenario[];
};

export type OpenCodeInstalledLiveHarnessCommand = {
  executable: string;
  args: string[];
};

export type OpenCodeInstalledLiveHarnessExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type OpenCodeInstalledLiveHarnessScaffold = Omit<ExecutableWorkflowScaffold, "files"> & {
  files: ExecutableWorkflowScaffold["files"] & {
    prompt: string;
  };
  scenario: OpenCodeInstalledLiveScenario;
};

type OpenCodeInstalledLiveScenarioExecutionTurn = OpenCodeInstalledLiveScenarioTurn & {
  index: number;
  continueSession: boolean;
};

export type OpenCodeInstalledLiveHarnessTurnResult = {
  index: number;
  prompt: string;
  command: OpenCodeInstalledLiveHarnessCommand;
  ok: boolean;
  evaluation: OpenCodeInstalledLiveTranscriptResult;
  failureReasons: string[];
  exitCode: number;
  stderr: string;
};

export type OpenCodeInstalledLiveHarnessScenarioResult = {
  id: string;
  ok: boolean;
  evaluation: OpenCodeInstalledLiveTranscriptResult;
  failureReasons: string[];
  turns: OpenCodeInstalledLiveHarnessTurnResult[];
  repoDir: string;
};

export type OpenCodeInstalledLiveHarnessRunResult = {
  skipped: boolean;
  reason?: string;
  results: OpenCodeInstalledLiveHarnessScenarioResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
};

type RunOpenCodeInstalledLiveHarnessOptions = {
  manifestPath?: string;
  env?: Record<string, string | undefined>;
  exec?: (
    command: OpenCodeInstalledLiveHarnessCommand,
    scenario: OpenCodeInstalledLiveScenario,
    scaffold: OpenCodeInstalledLiveHarnessScaffold,
    turn: OpenCodeInstalledLiveScenarioExecutionTurn,
  ) => Promise<OpenCodeInstalledLiveHarnessExecResult>;
};

const DEFAULT_MANIFEST_PATH = new URL("../tests/opencode/installed-live-scenarios.json", import.meta.url)
  .pathname;
const DEFAULT_TIMEOUT_MS = 120_000;
const REQUIRED_VISIBLE_SKILLS = [
  "using-agentic",
  "executing-plans",
  "review-spec",
  "review-quality",
  "verify",
] as const;

function isInstalledLiveEnabled(env: Record<string, string | undefined>): boolean {
  return env.OPENCODE_INSTALLED_LIVE === "1";
}

function getTrimmedLines(transcript: string): string[] {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getLineIndex(lines: string[], predicate: (line: string) => boolean): number {
  return lines.findIndex(predicate);
}

function getLineIndexes(lines: string[], predicate: (line: string) => boolean): number[] {
  return lines.flatMap((line, index) => (predicate(line) ? [index] : []));
}

function getFirstIndexAfter(indexes: number[], minimumIndex: number): number {
  return indexes.find((index) => index > minimumIndex) ?? -1;
}

function parseVisibleSkills(lines: string[]): string[] {
  const line = lines.find((entry) => entry.startsWith("[skills] visible: "));
  return (
    line
      ?.replace("[skills] visible: ", "")
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean) ?? []
  );
}

function compareExpectations(
  evaluation: OpenCodeInstalledLiveTranscriptResult,
  expectation: OpenCodeInstalledLiveScenarioExpectation,
): string[] {
  const failures: string[] = [];

  if (evaluation.valid !== expectation.valid) {
    failures.push(`Expected valid=${expectation.valid}, received valid=${evaluation.valid}`);
  }

  if (
    expectation.workflowRoute !== undefined &&
    evaluation.workflowRoute !== expectation.workflowRoute
  ) {
    failures.push(
      `Expected workflowRoute=${expectation.workflowRoute}, received ${evaluation.workflowRoute}`,
    );
  }

  if (expectation.stages && JSON.stringify(evaluation.stages) !== JSON.stringify(expectation.stages)) {
    failures.push(
      `Expected stages=${expectation.stages.join(",")}, received ${evaluation.stages.join(",")}`,
    );
  }

  for (const issue of expectation.issues ?? []) {
    if (!evaluation.issues.includes(issue)) {
      failures.push(`Missing expected issue: ${issue}`);
    }
  }

  const unexpectedIssues = evaluation.issues.filter(
    (issue) => !(expectation.issues ?? []).includes(issue),
  );
  if (unexpectedIssues.length > 0) {
    failures.push(`Unexpected issues: ${unexpectedIssues.join(", ")}`);
  }

  return failures;
}

function getScenarioTurns(
  scenario: OpenCodeInstalledLiveScenario,
): OpenCodeInstalledLiveScenarioExecutionTurn[] {
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

export function buildOpenCodeInstalledLiveHarnessCommand({
  prompt,
  continueSession = false,
}: {
  prompt: string;
  continueSession?: boolean;
}): OpenCodeInstalledLiveHarnessCommand {
  return {
    executable: "opencode",
    args: ["run", "--print-logs", ...(continueSession ? ["--continue"] : []), prompt],
  };
}

async function defaultExec(
  command: OpenCodeInstalledLiveHarnessCommand,
  _scenario: OpenCodeInstalledLiveScenario,
  scaffold: OpenCodeInstalledLiveHarnessScaffold,
  _turn: OpenCodeInstalledLiveScenarioExecutionTurn,
): Promise<OpenCodeInstalledLiveHarnessExecResult> {
  const proc = Bun.spawn([command.executable, ...command.args], {
    cwd: scaffold.repoDir,
    stdout: "pipe",
    stderr: "pipe",
  });

  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<number>((resolve) => {
    timer = setTimeout(() => {
      try {
        proc.kill();
      } catch {
        // Process may have already exited.
      }
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

export async function loadOpenCodeInstalledLiveScenarioManifest(
  manifestPath = DEFAULT_MANIFEST_PATH,
): Promise<OpenCodeInstalledLiveScenarioManifest> {
  return (await Bun.file(manifestPath).json()) as OpenCodeInstalledLiveScenarioManifest;
}

export async function scaffoldOpenCodeInstalledLiveHarnessScenario(
  scenario: OpenCodeInstalledLiveScenario,
): Promise<OpenCodeInstalledLiveHarnessScaffold> {
  const initialPrompt = getScenarioTurns(scenario)[0]?.prompt ?? "";
  const config: ExecutableWorkflowHarnessConfig = {
    planId: scenario.scaffold.planId,
    taskId: scenario.scaffold.taskId,
    archetype: scenario.scaffold.archetype,
    promptFile: {
      file: "prompts/opencode-installed-live.txt",
      content: initialPrompt,
    },
    sample: {
      transcriptFile: "artifacts/opencode-installed-live.log",
    },
  };

  const scaffold = await scaffoldExecutableWorkflowHarness(config);
  return {
    ...scaffold,
    files: {
      ...scaffold.files,
      prompt: scaffold.files.prompt ?? join(scaffold.repoDir, "prompts", "opencode-installed-live.txt"),
    },
    scenario,
  };
}

export function evaluateOpenCodeInstalledLiveTranscript(
  transcript: string,
): OpenCodeInstalledLiveTranscriptResult {
  const lines = getTrimmedLines(transcript);
  const issues: string[] = [];
  const stages: OpenCodeInstalledLiveStage[] = [];
  const visibleSkills = parseVisibleSkills(lines);
  const missingSkills = REQUIRED_VISIBLE_SKILLS.filter((skill) => !visibleSkills.includes(skill));
  const workflowRouteLine = lines.find((line) => line.startsWith("[route] workflow: "));
  const workflowRoute = workflowRouteLine?.replace("[route] workflow: ", "").trim() ?? null;

  const installIndex = getLineIndex(
    lines,
    (line) => line === "[install] surface=opencode imitation-machine active",
  );
  const routeIndex = getLineIndex(lines, (line) => line.startsWith("[route] workflow: "));
  const planIndex = getLineIndex(lines, (line) => line === "[plan] status: approved");
  const implementationIndexes = getLineIndexes(lines, (line) => line.startsWith("[impl] wrote "));
  const implementationIndex = implementationIndexes.at(-1) ?? -1;
  const phaseStartIndex = implementationIndex >= 0 ? implementationIndex : -1;
  const reviewSpecIndexes = getLineIndexes(
    lines,
    (line) =>
      line.startsWith("[review-spec] command=bun ") &&
      /\bexit=0\b/.test(line) &&
      line.includes(" evidence-sha256="),
  );
  const reviewQualityIndexes = getLineIndexes(
    lines,
    (line) =>
      line.startsWith("[review-quality] command=bun ") &&
      /\bexit=0\b/.test(line) &&
      line.includes(" evidence-sha256="),
  );
  const verificationIndexes = getLineIndexes(
    lines,
    (line) =>
      line.startsWith("[verify] evidence source=current-run command=bun test exit=0 stdout-sha256="),
  );
  const reviewReadyIndexes = getLineIndexes(lines, (line) => line === "[state] review-ready");
  const staleVerification = lines.filter(
    (line) => line.startsWith("[verify] evidence ") && /\b(previous-run|stale)\b/.test(line),
  );
  const reviewSpecIndex = getFirstIndexAfter(reviewSpecIndexes, phaseStartIndex);
  const reviewQualityIndex = getFirstIndexAfter(reviewQualityIndexes, phaseStartIndex);
  const verificationIndex = getFirstIndexAfter(verificationIndexes, phaseStartIndex);
  const reviewReadyIndex = getFirstIndexAfter(reviewReadyIndexes, phaseStartIndex);
  const hadPriorReviewEvidence =
    reviewSpecIndexes.some((index) => index < implementationIndex) ||
    reviewQualityIndexes.some((index) => index < implementationIndex) ||
    verificationIndexes.some((index) => index < implementationIndex);
  const hasReviewEvidenceAfterLatestImplementation =
    reviewSpecIndexes.some((index) => index > implementationIndex) ||
    reviewQualityIndexes.some((index) => index > implementationIndex) ||
    verificationIndexes.some((index) => index > implementationIndex);
  const invalidatedPriorEvidence =
    implementationIndexes.length > 1 &&
    hadPriorReviewEvidence &&
    !hasReviewEvidenceAfterLatestImplementation;

  if (installIndex >= 0 && missingSkills.length === 0) {
    stages.push("install-visible-skills");
  } else {
    if (installIndex < 0) {
      issues.push("Missing install evidence");
    }
    if (missingSkills.length > 0) {
      issues.push(`Missing expected visible skills: ${missingSkills.join(", ")}`);
    }
  }

  if (workflowRoute === "executing-plans") {
    stages.push("workflow-routing");
  } else if (workflowRoute === null) {
    issues.push("Missing workflow routing");
  } else {
    issues.push(`Unsupported workflow route: ${workflowRoute}`);
  }

  if (planIndex >= 0) {
    stages.push("plan-approved");
  } else {
    issues.push("Missing approved plan evidence");
  }

  if (implementationIndex >= 0) {
    stages.push("implementation-written");
  } else {
    issues.push("Missing implementation evidence");
  }

  if (invalidatedPriorEvidence) {
    issues.push(
      "Latest implementation invalidated prior review/verify evidence; rerun review-spec, review-quality, and fresh verification",
    );
  } else {
    if (reviewSpecIndex >= 0) {
      stages.push("review-spec-passed");
    } else {
      issues.push("Missing review-spec evidence");
    }

    if (reviewQualityIndex >= 0) {
      stages.push("review-quality-passed");
    } else {
      issues.push("Missing review-quality evidence");
    }

    if (verificationIndex >= 0) {
      stages.push("verification-fresh");
    } else {
      issues.push("Missing fresh verification evidence");
    }

    if (reviewReadyIndex >= 0) {
      stages.push("review-ready");
    } else {
      issues.push("Missing review-ready state");
    }
  }

  if (reviewSpecIndex >= 0 && reviewQualityIndex >= 0 && reviewSpecIndex > reviewQualityIndex) {
    issues.push("Review sequence violated: review-spec must precede review-quality");
  }

  if (planIndex >= 0 && implementationIndexes[0] !== undefined && planIndex > implementationIndexes[0]) {
    issues.push("Implementation sequence violated: approved plan must precede implementation");
  }

  if (
    !invalidatedPriorEvidence &&
    verificationIndex >= 0 &&
    reviewReadyIndex >= 0 &&
    verificationIndex > reviewReadyIndex
  ) {
    issues.push("Review-ready sequence violated: fresh verification must precede review-ready");
  }

  if (staleVerification.length > 0) {
    issues.push(`Stale verification evidence: ${staleVerification.join("; ")}`);
  }

  const orderedIndexes = [
    installIndex,
    routeIndex,
    planIndex,
    implementationIndex,
    reviewSpecIndex,
    reviewQualityIndex,
    verificationIndex,
    reviewReadyIndex,
  ];
  if (!invalidatedPriorEvidence && orderedIndexes.every((index) => index >= 0)) {
    for (let index = 1; index < orderedIndexes.length; index += 1) {
      const previousIndex = orderedIndexes[index - 1];
      const currentIndex = orderedIndexes[index];

      if (previousIndex === undefined || currentIndex === undefined) {
        continue;
      }

      if (previousIndex >= currentIndex) {
        issues.push(
          "Out-of-order progression: install-visible-skills -> workflow-routing -> plan-approved -> implementation-written -> review-spec-passed -> review-quality-passed -> verification-fresh -> review-ready",
        );
        break;
      }
    }
  }

  return {
    valid: issues.length === 0,
    workflowRoute,
    stages,
    issues,
  };
}

export async function runOpenCodeInstalledLiveHarness({
  manifestPath = DEFAULT_MANIFEST_PATH,
  env = process.env,
  exec = defaultExec,
}: RunOpenCodeInstalledLiveHarnessOptions = {}): Promise<OpenCodeInstalledLiveHarnessRunResult> {
  const manifest = await loadOpenCodeInstalledLiveScenarioManifest(manifestPath);

  if (!isInstalledLiveEnabled(env)) {
    return {
      skipped: true,
      reason: "Set OPENCODE_INSTALLED_LIVE=1 to enable installed OpenCode live scenarios.",
      results: [],
      summary: {
        total: manifest.scenarios.length,
        passed: 0,
        failed: 0,
      },
    };
  }

  const results: OpenCodeInstalledLiveHarnessScenarioResult[] = [];

  for (const scenario of manifest.scenarios) {
    const scaffold = await scaffoldOpenCodeInstalledLiveHarnessScenario(scenario);
    const turns = getScenarioTurns(scenario);
    const turnResults: OpenCodeInstalledLiveHarnessTurnResult[] = [];
    let transcript = "";

    for (const turn of turns) {
      const command = buildOpenCodeInstalledLiveHarnessCommand({
        prompt: turn.prompt,
        continueSession: turn.continueSession,
      });
      const execution = await exec(command, scenario, scaffold, turn);
      transcript = transcript ? `${transcript}\n${execution.stdout}` : execution.stdout;
      await Bun.write(scaffold.files.transcript, `${transcript.trim()}\n`);

      const evaluation = evaluateOpenCodeInstalledLiveTranscript(transcript);
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
    const evaluation =
      turnResults.at(-1)?.evaluation ?? evaluateOpenCodeInstalledLiveTranscript(transcript);

    results.push({
      id: scenario.id,
      ok: failureReasons.length === 0,
      evaluation,
      failureReasons,
      turns: turnResults,
      repoDir: scaffold.repoDir,
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
  const result = await runOpenCodeInstalledLiveHarness();

  if (result.skipped) {
    console.log(`[opencode-installed-live] skipped: ${result.reason}`);
    return;
  }

  for (const scenario of result.results) {
    console.log(`[opencode-installed-live] ${scenario.ok ? "PASS" : "FAIL"} ${scenario.id}`);
    console.log(`[opencode-installed-live]   repo: ${scenario.repoDir}`);

    for (const turn of scenario.turns) {
      console.log(
        `[opencode-installed-live]   turn ${turn.index + 1}: ${turn.command.executable} ${turn.command.args.join(" ")}`,
      );
    }

    if (!scenario.ok) {
      for (const reason of scenario.failureReasons) {
        console.log(`[opencode-installed-live]   ${reason}`);
      }
    }
  }

  console.log(
    `[opencode-installed-live] summary: ${result.summary.passed} passed, ${result.summary.failed} failed, ${result.summary.total} total`,
  );

  if (result.summary.failed > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
