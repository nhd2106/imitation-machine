import { join } from "node:path";
import {
  scaffoldExecutableWorkflowHarness,
  type ExecutableWorkflowHarnessConfig,
  type ExecutableWorkflowScaffold,
} from "./executable-workflow-harness";

export type ClaudeInstalledLiveStage =
  | "install-visible-skills"
  | "workflow-routing"
  | "plan-approved"
  | "implementation-written"
  | "review-spec-passed"
  | "review-quality-passed"
  | "verification-fresh"
  | "review-ready";

export type ClaudeInstalledLiveTranscriptResult = {
  valid: boolean;
  workflowRoute: string | null;
  stages: ClaudeInstalledLiveStage[];
  issues: string[];
};

export type ClaudeInstalledLiveScenarioExpectation = {
  valid: boolean;
  workflowRoute?: string;
  stages?: ClaudeInstalledLiveStage[];
  issues?: string[];
};

export type ClaudeInstalledLiveScenario = {
  id: string;
  prompt: string;
  expect: ClaudeInstalledLiveScenarioExpectation;
  scaffold: {
    archetype: "docs-review";
    planId: string;
    taskId: string;
  };
};

export type ClaudeInstalledLiveScenarioManifest = {
  scenarios: ClaudeInstalledLiveScenario[];
};

export type ClaudeInstalledLiveHarnessCommand = {
  executable: string;
  args: string[];
};

export type ClaudeInstalledLiveHarnessExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type ClaudeInstalledLiveHarnessScaffold = Omit<ExecutableWorkflowScaffold, "files"> & {
  files: ExecutableWorkflowScaffold["files"] & {
    prompt: string;
  };
  scenario: ClaudeInstalledLiveScenario;
};

export type ClaudeInstalledLiveHarnessScenarioResult = {
  id: string;
  ok: boolean;
  command: ClaudeInstalledLiveHarnessCommand;
  evaluation: ClaudeInstalledLiveTranscriptResult;
  failureReasons: string[];
  exitCode: number;
  stderr: string;
  repoDir: string;
};

export type ClaudeInstalledLiveHarnessRunResult = {
  skipped: boolean;
  reason?: string;
  results: ClaudeInstalledLiveHarnessScenarioResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
};

type RunClaudeInstalledLiveHarnessOptions = {
  manifestPath?: string;
  env?: Record<string, string | undefined>;
  exec?: (
    command: ClaudeInstalledLiveHarnessCommand,
    scenario: ClaudeInstalledLiveScenario,
    scaffold: ClaudeInstalledLiveHarnessScaffold,
  ) => Promise<ClaudeInstalledLiveHarnessExecResult>;
};

const DEFAULT_MANIFEST_PATH = new URL("../tests/claude-code/installed-live-scenarios.json", import.meta.url)
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
  return env.CLAUDE_INSTALLED_LIVE === "1";
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

function parseVisibleSkills(lines: string[]): string[] {
  const line = lines.find((entry) => entry.startsWith("[skills] visible: "));
  return line
    ?.replace("[skills] visible: ", "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean) ?? [];
}

function compareExpectations(
  evaluation: ClaudeInstalledLiveTranscriptResult,
  expectation: ClaudeInstalledLiveScenarioExpectation,
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

  const unexpectedIssues = evaluation.issues.filter((issue) => !(expectation.issues ?? []).includes(issue));
  if (unexpectedIssues.length > 0) {
    failures.push(`Unexpected issues: ${unexpectedIssues.join(", ")}`);
  }

  return failures;
}

export function buildClaudeInstalledLiveHarnessCommand({
  prompt,
}: {
  prompt: string;
}): ClaudeInstalledLiveHarnessCommand {
  return {
    executable: "claude",
    args: ["--print", prompt],
  };
}

async function defaultExec(
  command: ClaudeInstalledLiveHarnessCommand,
  _scenario: ClaudeInstalledLiveScenario,
  scaffold: ClaudeInstalledLiveHarnessScaffold,
): Promise<ClaudeInstalledLiveHarnessExecResult> {
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

export async function loadClaudeInstalledLiveScenarioManifest(
  manifestPath = DEFAULT_MANIFEST_PATH,
): Promise<ClaudeInstalledLiveScenarioManifest> {
  return (await Bun.file(manifestPath).json()) as ClaudeInstalledLiveScenarioManifest;
}

export async function scaffoldClaudeInstalledLiveHarnessScenario(
  scenario: ClaudeInstalledLiveScenario,
): Promise<ClaudeInstalledLiveHarnessScaffold> {
  const config: ExecutableWorkflowHarnessConfig = {
    planId: scenario.scaffold.planId,
    taskId: scenario.scaffold.taskId,
    archetype: scenario.scaffold.archetype,
    promptFile: {
      file: "prompts/claude-installed-live.txt",
      content: scenario.prompt,
    },
    sample: {
      transcriptFile: "artifacts/claude-installed-live.log",
    },
  };

  const scaffold = await scaffoldExecutableWorkflowHarness(config);
  return {
    ...scaffold,
    files: {
      ...scaffold.files,
      prompt: scaffold.files.prompt ?? join(scaffold.repoDir, "prompts", "claude-installed-live.txt"),
    },
    scenario,
  };
}

export function evaluateClaudeInstalledLiveTranscript(
  transcript: string,
): ClaudeInstalledLiveTranscriptResult {
  const lines = getTrimmedLines(transcript);
  const issues: string[] = [];
  const stages: ClaudeInstalledLiveStage[] = [];
  const visibleSkills = parseVisibleSkills(lines);
  const missingSkills = REQUIRED_VISIBLE_SKILLS.filter((skill) => !visibleSkills.includes(skill));
  const workflowRouteLine = lines.find((line) => line.startsWith("[route] workflow: "));
  const workflowRoute = workflowRouteLine?.replace("[route] workflow: ", "").trim() ?? null;

  const installIndex = getLineIndex(
    lines,
    (line) => line === "[install] plugin imitation-machine@imitation-machine-dev installed",
  );
  const routeIndex = getLineIndex(lines, (line) => line.startsWith("[route] workflow: "));
  const planIndex = getLineIndex(lines, (line) => line === "[plan] status: approved");
  const implementationIndex = getLineIndex(lines, (line) => line.startsWith("[impl] wrote "));
  const reviewSpecIndex = getLineIndex(
    lines,
    (line) =>
      line.startsWith("[review-spec] command=bun ") &&
      /\bexit=0\b/.test(line) &&
      line.includes(" evidence-sha256="),
  );
  const reviewQualityIndex = getLineIndex(
    lines,
    (line) =>
      line.startsWith("[review-quality] command=bun ") &&
      /\bexit=0\b/.test(line) &&
      line.includes(" evidence-sha256="),
  );
  const verificationIndex = getLineIndex(
    lines,
    (line) =>
      line.startsWith("[verify] evidence source=current-run command=bun test exit=0 stdout-sha256="),
  );
  const reviewReadyIndex = getLineIndex(lines, (line) => line === "[state] review-ready");
  const staleVerification = lines.filter(
    (line) => line.startsWith("[verify] evidence ") && /\b(previous-run|stale)\b/.test(line),
  );

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

  if (reviewSpecIndex >= 0 && reviewQualityIndex >= 0 && reviewSpecIndex > reviewQualityIndex) {
    issues.push("Review sequence violated: review-spec must precede review-quality");
  }

  if (planIndex >= 0 && implementationIndex >= 0 && planIndex > implementationIndex) {
    issues.push("Implementation sequence violated: approved plan must precede implementation");
  }

  if (verificationIndex >= 0 && reviewReadyIndex >= 0 && verificationIndex > reviewReadyIndex) {
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
  if (orderedIndexes.every((index) => index >= 0)) {
    for (let index = 1; index < orderedIndexes.length; index += 1) {
      if (orderedIndexes[index - 1]! >= orderedIndexes[index]!) {
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

export async function runClaudeInstalledLiveHarness({
  manifestPath = DEFAULT_MANIFEST_PATH,
  env = process.env,
  exec = defaultExec,
}: RunClaudeInstalledLiveHarnessOptions = {}): Promise<ClaudeInstalledLiveHarnessRunResult> {
  const manifest = await loadClaudeInstalledLiveScenarioManifest(manifestPath);

  if (!isInstalledLiveEnabled(env)) {
    return {
      skipped: true,
      reason: "Set CLAUDE_INSTALLED_LIVE=1 to enable installed Claude live scenarios.",
      results: [],
      summary: {
        total: manifest.scenarios.length,
        passed: 0,
        failed: 0,
      },
    };
  }

  const results: ClaudeInstalledLiveHarnessScenarioResult[] = [];

  for (const scenario of manifest.scenarios) {
    const scaffold = await scaffoldClaudeInstalledLiveHarnessScenario(scenario);
    const command = buildClaudeInstalledLiveHarnessCommand({ prompt: scenario.prompt });
    const execution = await exec(command, scenario, scaffold);
    const evaluation = evaluateClaudeInstalledLiveTranscript(execution.stdout);
    const failureReasons = [
      ...(execution.exitCode === 0 ? [] : [`Command exited with code ${execution.exitCode}`]),
      ...compareExpectations(evaluation, scenario.expect),
    ];

    await Bun.write(scaffold.files.transcript, `${execution.stdout.trim()}\n`);

    results.push({
      id: scenario.id,
      ok: failureReasons.length === 0,
      command,
      evaluation,
      failureReasons,
      exitCode: execution.exitCode,
      stderr: execution.stderr,
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
  const result = await runClaudeInstalledLiveHarness();

  if (result.skipped) {
    console.log(`[claude-installed-live] skipped: ${result.reason}`);
    return;
  }

  for (const scenario of result.results) {
    console.log(`[claude-installed-live] ${scenario.ok ? "PASS" : "FAIL"} ${scenario.id}`);
    console.log(
      `[claude-installed-live]   command: ${scenario.command.executable} ${scenario.command.args.join(" ")}`,
    );
    console.log(`[claude-installed-live]   repo: ${scenario.repoDir}`);

    if (!scenario.ok) {
      for (const reason of scenario.failureReasons) {
        console.log(`[claude-installed-live]   ${reason}`);
      }
    }
  }

  console.log(
    `[claude-installed-live] summary: ${result.summary.passed} passed, ${result.summary.failed} failed, ${result.summary.total} total`,
  );

  if (result.summary.failed > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
