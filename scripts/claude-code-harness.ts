import { join } from "node:path";
import {
  runExecutableWorkflowHarness,
  scaffoldExecutableWorkflowHarness,
  type ExecutableWorkflowHarnessConfig,
  type ExecutableWorkflowRunResult,
} from "./executable-workflow-harness";

export type ClaudeStage = "install-visible-skills" | "workflow-routing" | "review-ready";

export type ClaudeTranscriptResult = {
  valid: boolean;
  stages: ClaudeStage[];
  visibleSkills: string[];
  workflowRoute: string | null;
  issues: string[];
};

const FAST_HARNESS_VISIBLE_SKILL_SUBSET = [
  "using-agentic",
  "requesting-code-review",
  "review-spec",
  "review-quality",
] as const;

const SUPPORTED_WORKFLOW_ROUTES = [
  "requesting-code-review",
  "receiving-code-review",
  "finishing-a-development-branch",
  "pr",
  "release",
] as const;

const INSTALL_MARKERS = ["[install] plugin imitation-machine@imitation-machine-dev installed"] as const;

const AGENT_OUTPUT_STATUSES = ["DONE", "DONE_WITH_CONCERNS", "NEEDS_CONTEXT", "BLOCKED"] as const;

export type ClaudeExecutableStage =
  | "install-visible-skills"
  | "workflow-routing"
  | "review-spec-passed"
  | "review-quality-passed"
  | "verification-fresh"
  | "review-ready";

export type ClaudeExecutableTranscriptResult = {
  valid: boolean;
  stages: ClaudeExecutableStage[];
  issues: string[];
};

export type ClaudeExecutableHarnessScaffold = {
  repoDir: string;
  files: {
    packageJson: string;
    prompt: string;
    plan: string;
    implementation: string;
    reviewSpec: string;
    reviewQuality: string;
    test: string;
    transcript: string;
  };
};

export type ClaudeExecutableCommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type ClaudeExecutableHarnessRunResult = ClaudeExecutableHarnessScaffold & {
  createdFiles: string[];
  transcript: string;
  workflowRun: ExecutableWorkflowRunResult;
  failingTest: ClaudeExecutableCommandResult;
  reviewSpec: ClaudeExecutableCommandResult;
  reviewQuality: ClaudeExecutableCommandResult;
  verification: ClaudeExecutableCommandResult;
  validation: ClaudeExecutableTranscriptResult;
};

const CLAUDE_EXECUTABLE_HARNESS_CONFIG = {
  planId: "PLN-PR31",
  taskId: "TSK-PR31-1",
  promptFile: {
    file: "prompts/claude-review-request.txt",
    content: [
      "Use the bounded Claude review lane for this temp repo.",
      "Follow TDD, keep the repo single-task, run review-spec before review-quality, then capture fresh verify evidence before reporting review-ready.",
    ].join("\n"),
  },
  content: {
    plan: [
      "# PLN-PR31",
      "",
      "Status: approved",
      "Task count: 1",
      "",
      "## Task TSK-PR31-1",
      "- Outcome: add a bounded Claude executable harness sample",
      "- Scope: single temp repo review lane",
      "- Verification: bun test",
    ].join("\n"),
    implementation: [
      "export function sum(left: number, right: number): number {",
      "  return left + right;",
      "}",
      "",
    ].join("\n"),
    test: [
      'import { describe, expect, test } from "bun:test";',
      'import { sum } from "../src/sum";',
      "",
      'describe("sum", () => {',
      '  test("adds two numbers", () => {',
      "    expect(sum(1, 2)).toBe(3);",
      "  });",
      "});",
      "",
    ].join("\n"),
    reviewSpec: [
      'import { readFile } from "node:fs/promises";',
      'import { join } from "node:path";',
      "",
      "const repoDir = process.cwd();",
      'const [prompt, plan, testFile] = await Promise.all([',
      '  readFile(join(repoDir, "prompts", "claude-review-request.txt"), "utf8"),',
      '  readFile(join(repoDir, "plans", "PLN-PR31.md"), "utf8"),',
      '  readFile(join(repoDir, "tests", "sum.test.ts"), "utf8"),',
      "]);",
      "",
      "const report = {",
      '  review: "spec",',
      '  promptFile: join(repoDir, "prompts", "claude-review-request.txt"),',
      '  promptVisible: prompt.includes("review-spec before review-quality"),',
      '  approvedPlan: plan.includes("Status: approved"),',
      '  singleTaskPlan: plan.includes("Task count: 1"),',
      '  usesBunTest: testFile.includes(\'from "bun:test"\'),',
      "};",
      "",
      "console.log(JSON.stringify(report));",
      'process.exitCode = Object.values(report).every((value) => typeof value !== "boolean" || value) ? 0 : 1;',
      "",
    ].join("\n"),
    reviewQuality: [
      'import { readFile } from "node:fs/promises";',
      'import { join } from "node:path";',
      "",
      "const repoDir = process.cwd();",
      'const [prompt, implementation, testFile] = await Promise.all([',
      '  readFile(join(repoDir, "prompts", "claude-review-request.txt"), "utf8"),',
      '  readFile(join(repoDir, "src", "sum.ts"), "utf8"),',
      '  readFile(join(repoDir, "tests", "sum.test.ts"), "utf8"),',
      "]);",
      "",
      "const report = {",
      '  review: "quality",',
      '  promptFile: join(repoDir, "prompts", "claude-review-request.txt"),',
      '  promptVisible: prompt.includes("review-spec before review-quality"),',
      '  exportsSum: implementation.includes("export function sum"),',
      '  addsNumbers: implementation.includes("return left + right"),',
      '  coversHappyPath: testFile.includes("expect(sum(1, 2)).toBe(3)"),',
      "};",
      "",
      "console.log(JSON.stringify(report));",
      'process.exitCode = Object.values(report).every((value) => typeof value !== "boolean" || value) ? 0 : 1;',
      "",
    ].join("\n"),
  },
  sample: {
    implementationFile: "src/sum.ts",
    testFile: "tests/sum.test.ts",
    reviewSpecFile: "scripts/review-spec.ts",
    reviewQualityFile: "scripts/review-quality.ts",
    transcriptFile: "artifacts/claude-transcript.log",
  },
} as const satisfies ExecutableWorkflowHarnessConfig;

function parseVisibleSkills(transcript: string): string[] {
  const match = transcript.match(/\[skills\]\s+visible:\s+(.+)/);
  if (!match?.[1]) {
    return [];
  }

  return match[1]
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
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

function parseWorkflowRoute(lines: string[]): string | null {
  const routeLine = lines.find((line) => line.startsWith("[route] workflow: "));
  return routeLine?.replace("[route] workflow: ", "").trim() || null;
}

function parseLoadedWorkflowSkill(lines: string[]): string | null {
  const loadedLine = lines.find((line) => line.startsWith("[skill] workflow skill loaded: "));
  return loadedLine?.replace("[skill] workflow skill loaded: ", "").trim() || null;
}

function getStaleVerificationEvidence(lines: string[]): string[] {
  return lines.filter(
    (line) =>
      line.startsWith("[verify] evidence ") &&
      /\b(previous-run|stale)\b/.test(line),
  );
}

function getAgentOutputLines(lines: string[]): string[] {
  const agentOutputLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(\[agent:[^\]]+\] status: )(DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED)$/);

    if (match && (AGENT_OUTPUT_STATUSES as readonly string[]).includes(match[2]!)) {
      agentOutputLines.push(line);
    }
  }

  return agentOutputLines;
}

export function evaluateClaudeTranscript(transcript: string): ClaudeTranscriptResult {
  const issues: string[] = [];
  const stages: ClaudeStage[] = [];
  const lines = getTrimmedLines(transcript);
  const visibleSkills = parseVisibleSkills(transcript);
  const workflowRoute = parseWorkflowRoute(lines);
  const loadedWorkflowSkill = parseLoadedWorkflowSkill(lines);
  const installed = INSTALL_MARKERS.every((marker) => lines.includes(marker));
  const reviewReady = lines.includes("[state] review-ready");
  const installIndex = getLineIndex(lines, (line) => line === "[install] plugin imitation-machine@imitation-machine-dev installed");
  const skillsIndex = getLineIndex(lines, (line) => line.startsWith("[skills] visible: "));
  const routingIndex = getLineIndex(lines, (line) => line.startsWith("[route] workflow: "));
  const reviewReadyIndex = lines.findIndex((line) => line === "[state] review-ready");
  const missingVisibleSkills = FAST_HARNESS_VISIBLE_SKILL_SUBSET.filter((skill) =>
    !visibleSkills.includes(skill),
  );
  const missingInstallMarkers = INSTALL_MARKERS.filter((marker) => !lines.includes(marker));
  const staleVerificationEvidence = getStaleVerificationEvidence(lines);
  const agentOutputLines = getAgentOutputLines(lines);
  const uniqueAgentOutputStatuses = [...new Set(agentOutputLines.map((line) => line.split(": ").at(-1)))];
  const routeSupported =
    workflowRoute !== null &&
    (SUPPORTED_WORKFLOW_ROUTES as readonly string[]).includes(workflowRoute);

  if (installed && missingVisibleSkills.length === 0) {
    stages.push("install-visible-skills");
  } else {
    if (!installed) {
      issues.push(`Missing install evidence: ${missingInstallMarkers.join("; ")}`);
    }
    if (missingVisibleSkills.length > 0) {
      issues.push(`Missing expected visible skills: ${missingVisibleSkills.join(", ")}`);
    }
  }

  if (routeSupported) {
    stages.push("workflow-routing");
  } else {
    if (workflowRoute === null) {
      issues.push("Missing workflow routing");
    } else {
      issues.push(`Unsupported workflow route: ${workflowRoute}`);
    }
  }

  if (workflowRoute && loadedWorkflowSkill && workflowRoute !== loadedWorkflowSkill) {
    issues.push(
      `Wrong workflow skill loaded: [route] workflow: ${workflowRoute}; [skill] workflow skill loaded: ${loadedWorkflowSkill}`,
    );
  }

  if (staleVerificationEvidence.length > 0) {
    issues.push(`Stale verification evidence: ${staleVerificationEvidence.join("; ")}`);
  }

  if (uniqueAgentOutputStatuses.length > 1) {
    issues.push(`Contradictory agent outputs: ${agentOutputLines.join("; ")}`);
  }

  if (reviewReady) {
    stages.push("review-ready");
  } else {
    issues.push("Missing review-ready state");
  }

  if (
    installed &&
    missingVisibleSkills.length === 0 &&
    routeSupported &&
    reviewReady &&
    !(installIndex < skillsIndex && skillsIndex < routingIndex && routingIndex < reviewReadyIndex)
  ) {
    issues.push("Out-of-order progression: install-visible-skills -> workflow-routing -> review-ready");
  }

  return {
    valid: issues.length === 0,
    stages,
    visibleSkills,
    workflowRoute,
    issues,
  };
}

const CLAUDE_EXECUTABLE_VISIBLE_SKILLS =
  "using-agentic, requesting-code-review, review-spec, review-quality";

export function evaluateClaudeExecutableTranscript(transcript: string): ClaudeExecutableTranscriptResult {
  const base = evaluateClaudeTranscript(transcript);
  const lines = getTrimmedLines(transcript);
  const issues = [...base.issues];
  const stages: ClaudeExecutableStage[] = [];

  const installIndex = getLineIndex(
    lines,
    (line) => line === "[install] plugin imitation-machine@imitation-machine-dev installed",
  );
  const routingIndex = getLineIndex(lines, (line) => line.startsWith("[route] workflow: "));
  const reviewSpecIndex = getLineIndex(
    lines,
    (line) => line.startsWith("[review-spec] command=bun ") && /\bexit=0\b/.test(line) && line.includes(" evidence-sha256="),
  );
  const reviewQualityIndex = getLineIndex(
    lines,
    (line) => line.startsWith("[review-quality] command=bun ") && /\bexit=0\b/.test(line) && line.includes(" evidence-sha256="),
  );
  const verificationIndex = getLineIndex(
    lines,
    (line) =>
      line.startsWith("[verify] evidence source=current-run command=bun test exit=0 stdout-sha256="),
  );
  const reviewReadyIndex = getLineIndex(lines, (line) => line === "[state] review-ready");

  if (base.stages.includes("install-visible-skills")) {
    stages.push("install-visible-skills");
  }
  if (base.stages.includes("workflow-routing")) {
    stages.push("workflow-routing");
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
  if (base.stages.includes("review-ready")) {
    stages.push("review-ready");
  }

  if (reviewSpecIndex >= 0 && reviewQualityIndex >= 0 && reviewSpecIndex > reviewQualityIndex) {
    issues.push("Review sequence violated: review-spec must precede review-quality");
  }

  if (
    installIndex >= 0 &&
    routingIndex >= 0 &&
    reviewSpecIndex >= 0 &&
    reviewQualityIndex >= 0 &&
    verificationIndex >= 0 &&
    reviewReadyIndex >= 0 &&
    !(installIndex < routingIndex &&
      routingIndex < reviewSpecIndex &&
      reviewSpecIndex < reviewQualityIndex &&
      reviewQualityIndex < verificationIndex &&
      verificationIndex < reviewReadyIndex)
  ) {
    issues.push(
      "Out-of-order Claude executable progression: install-visible-skills -> workflow-routing -> review-spec-passed -> review-quality-passed -> verification-fresh -> review-ready",
    );
  }

  return {
    valid: issues.length === 0,
    stages,
    issues,
  };
}

export async function scaffoldClaudeExecutableHarness(): Promise<ClaudeExecutableHarnessScaffold> {
  const workflowScaffold = await scaffoldExecutableWorkflowHarness(CLAUDE_EXECUTABLE_HARNESS_CONFIG);
  return {
    repoDir: workflowScaffold.repoDir,
    files: {
      packageJson: workflowScaffold.files.packageJson,
      prompt: workflowScaffold.files.prompt ?? join(workflowScaffold.repoDir, "prompts", "claude-review-request.txt"),
      plan: workflowScaffold.files.plan,
      implementation: workflowScaffold.files.implementation,
      reviewSpec: workflowScaffold.files.reviewSpec,
      reviewQuality: workflowScaffold.files.reviewQuality,
      test: workflowScaffold.files.test,
      transcript: workflowScaffold.files.transcript,
    },
  };
}

export async function runClaudeExecutableHarness(): Promise<ClaudeExecutableHarnessRunResult> {
  const workflowRun = await runExecutableWorkflowHarness(CLAUDE_EXECUTABLE_HARNESS_CONFIG);
  const files = {
    ...workflowRun.files,
    prompt: workflowRun.files.prompt ?? join(workflowRun.repoDir, "prompts", "claude-review-request.txt"),
  };

  const transcript = [
    "[install] plugin imitation-machine@imitation-machine-dev installed",
    `[skills] visible: ${CLAUDE_EXECUTABLE_VISIBLE_SKILLS}`,
    "[route] workflow: requesting-code-review",
    "[skill] workflow skill loaded: requesting-code-review",
    `[prompt] file: ${files.prompt}`,
    workflowRun.transcript.trim(),
    "[state] review-ready",
  ].join("\n");

  await Bun.write(files.transcript, `${transcript}\n`);

  return {
    repoDir: workflowRun.repoDir,
    files,
    createdFiles: workflowRun.createdFiles,
    transcript: `${transcript}\n`,
    workflowRun,
    failingTest: workflowRun.failingTest,
    reviewSpec: workflowRun.reviewSpec,
    reviewQuality: workflowRun.reviewQuality,
    verification: workflowRun.verification,
    validation: evaluateClaudeExecutableTranscript(transcript),
  };
}
