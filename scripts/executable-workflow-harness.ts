import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";

export type ExecutableWorkflowStage =
  | "repo-scaffolded"
  | "plan-approved"
  | "failing-test-observed"
  | "implementation-written"
  | "review-spec-passed"
  | "review-quality-passed"
  | "verification-fresh";

export type ExecutableWorkflowValidation = {
  valid: boolean;
  stages: ExecutableWorkflowStage[];
  issues: string[];
};

export type ExecutableWorkflowScaffold = {
  repoDir: string;
  files: {
    packageJson: string;
    prompt?: string;
    plan: string;
    implementation: string;
    reviewSpec: string;
    reviewQuality: string;
    test: string;
    transcript: string;
  };
};

export type ExecutableWorkflowHarnessConfig = {
  planId?: string;
  taskId?: string;
  archetype?: "default" | "frontend-app" | "cli-service" | "docs-review";
  variant?: "default" | "review-spec-recovery";
  repoShape?: "default" | "alternate";
  promptFile?: {
    file: string;
    content: string;
  };
  content?: {
    plan?: string;
    implementation?: string;
    reviewSpec?: string;
    reviewQuality?: string;
    test?: string;
  };
  sample?: {
    implementationFile?: string;
    testFile?: string;
    reviewSpecFile?: string;
    reviewQualityFile?: string;
    transcriptFile?: string;
  };
};

export type ExecutableWorkflowCommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type ExecutableWorkflowRunResult = ExecutableWorkflowScaffold & {
  createdFiles: string[];
  transcript: string;
  failingTest: ExecutableWorkflowCommandResult;
  reviewSpec: ExecutableWorkflowCommandResult;
  reviewQuality: ExecutableWorkflowCommandResult;
  verification: ExecutableWorkflowCommandResult;
  validation: ExecutableWorkflowValidation;
};

type ExecutableWorkflowFailureContext = Pick<
  ExecutableWorkflowRunResult,
  "validation" | "failingTest" | "reviewSpec" | "reviewQuality" | "verification"
>;

const NON_ZERO_EXIT_PATTERN = /(?:^|\s)exit=-?[1-9]\d*(?:\s|$)/;

const STAGE_MARKERS: Array<[ExecutableWorkflowStage, (line: string) => boolean]> = [
  ["repo-scaffolded", (line) => line === "[state] repo-scaffolded"],
  ["plan-approved", (line) => line === "[plan] status: approved"],
  [
    "failing-test-observed",
    (line) =>
      line.startsWith("[tdd] failing test observed command=bun test") && NON_ZERO_EXIT_PATTERN.test(line),
  ],
  ["implementation-written", (line) => line.startsWith("[impl] wrote ")],
  [
    "review-spec-passed",
    (line) => line.startsWith("[review-spec] command=bun ") && /\bexit=0\b/.test(line) && line.includes(" evidence-sha256="),
  ],
  [
    "review-quality-passed",
    (line) =>
      line.startsWith("[review-quality] command=bun ") && /\bexit=0\b/.test(line) && line.includes(" evidence-sha256="),
  ],
  ["verification-fresh", (line) => line.startsWith("[verify] evidence source=current-run command=bun test exit=0 stdout-sha256=")],
];

const DEFAULT_CONFIG = {
  planId: "PLN-PR29",
  taskId: "TSK-PR29-1",
  variant: "default",
  repoShape: "default",
  sample: {
    implementationFile: "src/math.ts",
    testFile: "tests/math.test.ts",
    reviewSpecFile: "scripts/review-spec.ts",
    reviewQualityFile: "scripts/review-quality.ts",
    transcriptFile: "artifacts/workflow-transcript.log",
  },
} as const;

const ALTERNATE_REPO_SHAPE_SAMPLE = {
  implementationFile: "lib/numbers/add.ts",
  testFile: "specs/numbers/add.spec.ts",
  reviewSpecFile: "tools/reviewers/review-spec.ts",
  reviewQualityFile: "tools/reviewers/review-quality.ts",
  transcriptFile: "tmp/artifacts/workflow-transcript.log",
} as const;

type ExecutableWorkflowQualityExpectations = {
  exportIndicator: string;
  behaviorIndicators: string[];
  testIndicators: string[];
};

const EXECUTABLE_WORKFLOW_ARCHETYPES = {
  "frontend-app": {
    sample: {
      implementationFile: "src/frontend/app.tsx",
      testFile: "tests/frontend/app.test.tsx",
      reviewSpecFile: "scripts/review-spec.ts",
      reviewQualityFile: "scripts/review-quality.ts",
      transcriptFile: "artifacts/workflow-transcript.log",
    },
    planOutcome: "render a frontend headline via Bun-tested workflow harness sample",
    exportName: "renderHeadline",
    testName: "renders the page headline",
    testExpectation: 'expect(renderHeadline("Docs")).toBe("<h1>Docs</h1>")',
    implementation: `export function renderHeadline(title: string): string {\n  return \`<h1>\${title}</h1>\`;\n}\n`,
    reviewQualityExpectations: {
      exportIndicator: "export function renderHeadline",
      behaviorIndicators: ["<h1>", "</h1>"],
      testIndicators: ['renderHeadline("Docs")', 'toBe("<h1>Docs</h1>")'],
    },
  },
  "cli-service": {
    sample: {
      implementationFile: "src/cli/service.ts",
      testFile: "tests/cli/service.test.ts",
      reviewSpecFile: "scripts/review-spec.ts",
      reviewQualityFile: "scripts/review-quality.ts",
      transcriptFile: "artifacts/workflow-transcript.log",
    },
    planOutcome: "format CLI service output via Bun-tested workflow harness sample",
    exportName: "formatCommandResult",
    testName: "formats the command result",
    testExpectation: 'expect(formatCommandResult("build")).toBe("cli-service:build")',
    implementation:
      'export function formatCommandResult(commandName: string): string {\n  return `cli-service:${commandName}`;\n}\n',
    reviewQualityExpectations: {
      exportIndicator: "export function formatCommandResult",
      behaviorIndicators: ["cli-service:"],
      testIndicators: ['formatCommandResult("build")', 'toBe("cli-service:build")'],
    },
  },
  "docs-review": {
    sample: {
      implementationFile: "src/docs/review.ts",
      testFile: "tests/docs/review.test.ts",
      reviewSpecFile: "scripts/review-spec.ts",
      reviewQualityFile: "scripts/review-quality.ts",
      transcriptFile: "artifacts/workflow-transcript.log",
    },
    planOutcome: "summarize docs review findings via Bun-tested workflow harness sample",
    exportName: "summarizeDocReview",
    testName: "summarizes review findings",
    testExpectation: 'expect(summarizeDocReview(["clarify setup"])).toBe("docs-review:clarify setup")',
    implementation:
      'export function summarizeDocReview(findings: string[]): string {\n  return `docs-review:${findings.join(", ")}`;\n}\n',
    reviewQualityExpectations: {
      exportIndicator: "export function summarizeDocReview",
      behaviorIndicators: ["docs-review:", 'join(", ")'],
      testIndicators: ['summarizeDocReview(["clarify setup"])', 'toBe("docs-review:clarify setup")'],
    },
  },
} as const;

type ExecutableWorkflowArchetype = "default" | keyof typeof EXECUTABLE_WORKFLOW_ARCHETYPES;

type ResolvedExecutableWorkflowHarnessConfig = {
  planId: string;
  taskId: string;
  archetype: ExecutableWorkflowArchetype;
  variant: "default" | "review-spec-recovery";
  repoShape: "default" | "alternate";
  promptFile?: {
    file: string;
    content: string;
  };
  content: {
    plan?: string;
    implementation?: string;
    reviewSpec?: string;
    reviewQuality?: string;
    test?: string;
  };
  sample: {
    implementationFile: string;
    testFile: string;
    reviewSpecFile: string;
    reviewQualityFile: string;
    transcriptFile: string;
  };
};

function resolveHarnessConfig(
  config: ExecutableWorkflowHarnessConfig = {},
): ResolvedExecutableWorkflowHarnessConfig {
  const archetype = config.archetype ?? "default";
  const repoShape = config.repoShape ?? DEFAULT_CONFIG.repoShape;
  const baseSample =
    archetype === "default"
      ? repoShape === "alternate"
        ? ALTERNATE_REPO_SHAPE_SAMPLE
        : DEFAULT_CONFIG.sample
      : EXECUTABLE_WORKFLOW_ARCHETYPES[archetype].sample;

  return {
    planId: config.planId ?? DEFAULT_CONFIG.planId,
    taskId: config.taskId ?? DEFAULT_CONFIG.taskId,
    archetype,
    variant: config.variant ?? DEFAULT_CONFIG.variant,
    repoShape,
    promptFile: config.promptFile,
    content: config.content ?? {},
    sample: {
      implementationFile: config.sample?.implementationFile ?? baseSample.implementationFile,
      testFile: config.sample?.testFile ?? baseSample.testFile,
      reviewSpecFile: config.sample?.reviewSpecFile ?? baseSample.reviewSpecFile,
      reviewQualityFile: config.sample?.reviewQualityFile ?? baseSample.reviewQualityFile,
      transcriptFile: config.sample?.transcriptFile ?? baseSample.transcriptFile,
    },
  };
}

function getArchetypeDefinition(archetype: ExecutableWorkflowArchetype) {
  return archetype === "default" ? null : EXECUTABLE_WORKFLOW_ARCHETYPES[archetype];
}

function getSampleModuleName(implementationFile: string): string {
  return basename(implementationFile, extname(implementationFile));
}

function toTypeScriptIdentifier(value: string): string {
  const segments = value.match(/[A-Za-z0-9]+/g) ?? [];
  const camelCased = segments
    .map((segment, index) => {
      const normalized = segment.toLowerCase();
      return index === 0
        ? normalized
        : normalized.slice(0, 1).toUpperCase() + normalized.slice(1);
    })
    .join("");

  if (!camelCased) {
    return "sample";
  }

  return /^[A-Za-z_$]/.test(camelCased) ? camelCased : `_${camelCased}`;
}

function getSampleExportName(moduleName: string): string {
  const identifier = toTypeScriptIdentifier(moduleName);
  return identifier === "math" ? "add" : `${identifier}Values`;
}

function getImplementationRelativeImport(testFile: string, implementationFile: string): string {
  const testParts = testFile.split("/");
  const implementationParts = implementationFile.split("/");
  while (testParts.length > 0 && implementationParts.length > 0 && testParts[0] === implementationParts[0]) {
    testParts.shift();
    implementationParts.shift();
  }

  const up = testParts.slice(0, -1).map(() => "..");
  const target = implementationParts.join("/").replace(/\.[^.]+$/, "");
  const relativePath = [...up, target].join("/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

function createPlanContent(
  planId: string,
  taskId: string,
  archetype: ExecutableWorkflowArchetype,
  variant: ResolvedExecutableWorkflowHarnessConfig["variant"],
): string {
  const recoveryMarker = variant === "review-spec-recovery" ? "" : "- Recovery marker: review-spec-ready\n";
  const outcome =
    getArchetypeDefinition(archetype)?.planOutcome ??
    "add numbers via Bun-tested workflow harness sample";
  return `# ${planId}\n\nStatus: approved\nTask count: 1\n\n## Task ${taskId}\n- Outcome: ${outcome}\n- Scope: single task only\n- Verification: bun test\n${recoveryMarker}`;
}

function createTestContent(
  testFile: string,
  implementationFile: string,
  archetype: ExecutableWorkflowArchetype,
): string {
  const archetypeDefinition = getArchetypeDefinition(archetype);
  if (archetypeDefinition) {
    const importPath = getImplementationRelativeImport(testFile, implementationFile);
    return `import { describe, expect, test } from "bun:test";\nimport { ${archetypeDefinition.exportName} } from "${importPath}";\n\ndescribe("${getSampleModuleName(implementationFile)}", () => {\n  test("${archetypeDefinition.testName}", () => {\n    ${archetypeDefinition.testExpectation};\n  });\n});\n`;
  }

  const moduleName = getSampleModuleName(implementationFile);
  const exportName = getSampleExportName(moduleName);
  const importPath = getImplementationRelativeImport(testFile, implementationFile);
  return `import { describe, expect, test } from "bun:test";\nimport { ${exportName} } from "${importPath}";\n\ndescribe("${moduleName}", () => {\n  test("adds two numbers", () => {\n    expect(${exportName}(1, 2)).toBe(3);\n  });\n});\n`;
}

function createImplementationContent(
  implementationFile: string,
  archetype: ExecutableWorkflowArchetype,
): string {
  const archetypeDefinition = getArchetypeDefinition(archetype);
  if (archetypeDefinition) {
    return archetypeDefinition.implementation;
  }

  const exportName = getSampleExportName(getSampleModuleName(implementationFile));
  return `export function ${exportName}(left: number, right: number): number {\n  return left + right;\n}\n`;
}

function createReviewSpecContent(
  planId: string,
  testFile: string,
  variant: ResolvedExecutableWorkflowHarnessConfig["variant"],
): string {
  const testFileParts = testFile.split("/");
  const recoveryCheck =
    variant === "review-spec-recovery"
      ? '  recoveryMarkerPresent: plan.includes("Recovery marker: review-spec-ready"),\n'
      : "";
  return `import { readFile } from "node:fs/promises";\nimport { join } from "node:path";\n\nconst repoDir = process.cwd();\nconst planFile = join(repoDir, "plans", "${planId}.md");\nconst testFile = join(repoDir, ${testFileParts.map((part) => `"${part}"`).join(", ")});\nconst [plan, test] = await Promise.all([readFile(planFile, "utf8"), readFile(testFile, "utf8")]);\nconst report = {\n  review: "spec",\n  planFile,\n  testFile,\n  approvedPlan: plan.includes("Status: approved"),\n  singleTaskPlan: plan.includes("Task count: 1"),\n  usesBunTest: test.includes('from "bun:test"'),\n${recoveryCheck}};\nconsole.log(JSON.stringify(report));\nprocess.exitCode = Object.values(report).every((value) => typeof value !== "boolean" || value) ? 0 : 1;\n`;
}

function createReviewQualityContent(
  implementationFile: string,
  testFile: string,
  archetype: ExecutableWorkflowArchetype,
): string {
  const implementationFileParts = implementationFile.split("/");
  const testFileParts = testFile.split("/");
  const archetypeDefinition = getArchetypeDefinition(archetype);
  if (archetypeDefinition) {
    const qualityExpectations = archetypeDefinition.reviewQualityExpectations;
    return `import { readFile } from "node:fs/promises";\nimport { join } from "node:path";\n\nconst repoDir = process.cwd();\nconst implementationFile = join(repoDir, ${implementationFileParts
      .map((part) => `"${part}"`)
      .join(", ")});\nconst testFile = join(repoDir, ${testFileParts.map((part) => `"${part}"`).join(", ")});\nconst [implementation, test] = await Promise.all([readFile(implementationFile, "utf8"), readFile(testFile, "utf8")]);\nconst report = {\n  review: "quality",\n  implementationFile,\n  testFile,\n  exportsArchetypeFunction: implementation.includes(${JSON.stringify(
        qualityExpectations.exportIndicator,
      )}),\n  preservesArchetypeBehavior: ${qualityExpectations.behaviorIndicators
        .map((indicator) => `implementation.includes(${JSON.stringify(indicator)})`)
        .join(" && ")},\n  coversHappyPath: ${qualityExpectations.testIndicators
        .map((indicator) => `test.includes(${JSON.stringify(indicator)})`)
        .join(" && ")},\n};\nconsole.log(JSON.stringify(report));\nprocess.exitCode = Object.values(report).every((value) => typeof value !== "boolean" || value) ? 0 : 1;\n`;
  }

  const exportName = getSampleExportName(getSampleModuleName(implementationFile));
  const defaultQualityExpectations: ExecutableWorkflowQualityExpectations = {
    exportIndicator: `export function ${exportName}`,
    behaviorIndicators: ["left + right"],
    testIndicators: [`expect(${exportName}(1, 2))`, "toBe(3)"],
  };
  return `import { readFile } from "node:fs/promises";\nimport { join } from "node:path";\n\nconst repoDir = process.cwd();\nconst implementationFile = join(repoDir, ${implementationFileParts
    .map((part) => `"${part}"`)
    .join(", ")});\nconst testFile = join(repoDir, ${testFileParts.map((part) => `"${part}"`).join(", ")});\nconst [implementation, test] = await Promise.all([readFile(implementationFile, "utf8"), readFile(testFile, "utf8")]);\nconst report = {\n  review: "quality",\n  implementationFile,\n  testFile,\n  exportsAdd: implementation.includes(${JSON.stringify(defaultQualityExpectations.exportIndicator)}),\n  addsNumbers: ${defaultQualityExpectations.behaviorIndicators
    .map((indicator) => `implementation.includes(${JSON.stringify(indicator)})`)
    .join(" && ")},\n  coversHappyPath: ${defaultQualityExpectations.testIndicators
    .map((indicator) => `test.includes(${JSON.stringify(indicator)})`)
    .join(" && ")},\n};\nconsole.log(JSON.stringify(report));\nprocess.exitCode = Object.values(report).every((value) => typeof value !== "boolean" || value) ? 0 : 1;\n`;
}

function getTrimmedLines(transcript: string): string[] {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function createEvidenceSha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function summarizeCommandOutput(output: string): string | null {
  const normalized = output.trim();
  if (!normalized) {
    return null;
  }

  const singleLine = normalized.replaceAll("\r\n", "\n");
  return JSON.stringify(singleLine.length > 500 ? `${singleLine.slice(0, 500)}…` : singleLine);
}

function formatFailedCommandContext(
  label: string,
  result: ExecutableWorkflowCommandResult,
): string[] {
  if (result.exitCode === 0) {
    return [];
  }

  const stderr = summarizeCommandOutput(result.stderr);
  const stdout = summarizeCommandOutput(result.stdout);

  return [
    `[executable-workflow] ${label} exit=${result.exitCode}`,
    stderr
      ? `[executable-workflow] ${label} stderr=${stderr}`
      : stdout
        ? `[executable-workflow] ${label} stdout=${stdout}`
        : `[executable-workflow] ${label} reason=no stdout or stderr captured`,
    ...(stderr && stdout ? [`[executable-workflow] ${label} stdout=${stdout}`] : []),
  ];
}

export function formatExecutableWorkflowFailureContext(
  result: ExecutableWorkflowFailureContext,
): string[] {
  const failingTestIssues = result.validation.issues.filter(
    (issue) => issue.includes("failing-test-observed") || issue.includes("Failing-test stage violated"),
  );
  const failingTestContext = result.failingTest
    ? formatFailedCommandContext("failing-test", result.failingTest)
    : [];

  return [
    ...result.validation.issues.map((issue) => `[executable-workflow] issue=${issue}`),
    ...(failingTestIssues.length > 0
      ? [
          ...failingTestContext.slice(0, 1),
          ...(result.failingTest && result.failingTest.exitCode !== 0
            ? ["[executable-workflow] failing-test context=initial bun test failed for the wrong reason"]
            : []),
          ...failingTestContext.slice(1),
        ]
      : []),
    ...formatFailedCommandContext("review-spec", result.reviewSpec),
    ...formatFailedCommandContext("review-quality", result.reviewQuality),
    ...formatFailedCommandContext("verification", result.verification),
  ];
}

async function runBunCommand(
  repoDir: string,
  args: string[],
): Promise<ExecutableWorkflowCommandResult> {
  const proc = Bun.spawn(["bun", ...args], {
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

async function runBunTest(repoDir: string): Promise<ExecutableWorkflowCommandResult> {
  return runBunCommand(repoDir, ["test"]);
}

async function listCreatedFiles(rootDir: string, currentDir = rootDir): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listCreatedFiles(rootDir, fullPath)));
    } else {
      results.push(fullPath);
    }
  }

  return results.sort();
}

export function evaluateExecutableWorkflowTranscript(
  transcript: string,
): ExecutableWorkflowValidation {
  const lines = getTrimmedLines(transcript);
  const issues: string[] = [];
  const stages: ExecutableWorkflowStage[] = [];
  const indexes = STAGE_MARKERS.map(([stage, matcher]) => {
    const index = lines.findIndex(matcher);
    if (index >= 0) {
      stages.push(stage);
    } else {
      issues.push(`Missing transcript marker for stage: ${stage}`);
    }
    return index;
  });

  for (let index = 1; index < indexes.length; index += 1) {
    const previous = indexes[index - 1]!;
    const current = indexes[index]!;
    if (previous >= 0 && current >= 0 && previous >= current) {
      issues.push(
        "Out-of-order progression: repo-scaffolded -> plan-approved -> failing-test-observed -> implementation-written -> review-spec-passed -> review-quality-passed -> verification-fresh",
      );
      break;
    }
  }

  const reviewSpecIndex = lines.findIndex(
    (line) =>
      line.startsWith("[review-spec] command=bun ") && /\bexit=0\b/.test(line) && line.includes(" evidence-sha256="),
  );
  const failedReviewSpecIndex = lines.findIndex(
    (line) =>
      line.startsWith("[review-spec] command=bun ") && NON_ZERO_EXIT_PATTERN.test(line) && line.includes(" evidence-sha256="),
  );
  const fixIndex = lines.findIndex((line) => line.startsWith("[fix] applied review-spec-recovery"));
  const reviewQualityIndex = lines.findIndex((line) =>
    line.startsWith("[review-quality] command=bun ") && /\bexit=0\b/.test(line) && line.includes(" evidence-sha256="),
  );
  if (reviewSpecIndex >= 0 && reviewQualityIndex >= 0 && reviewSpecIndex > reviewQualityIndex) {
    issues.push("Review sequence violated: review-spec must precede review-quality");
  }
  if (failedReviewSpecIndex >= 0 || fixIndex >= 0) {
    if (failedReviewSpecIndex < 0) {
      issues.push("Recovery sequence violated: missing failed review-spec evidence before fix");
    }
    if (fixIndex < 0) {
      issues.push("Recovery sequence violated: missing deterministic fix marker before review-spec rerun");
    }
    if (failedReviewSpecIndex >= 0 && fixIndex >= 0 && failedReviewSpecIndex > fixIndex) {
      issues.push("Recovery sequence violated: failed review-spec must precede deterministic fix");
    }
    if (fixIndex >= 0 && reviewSpecIndex >= 0 && fixIndex > reviewSpecIndex) {
      issues.push("Recovery sequence violated: deterministic fix must precede passing review-spec rerun");
    }
  }

  const failingTestStageLine = lines.find((line) =>
    line.startsWith("[tdd] failing test observed command=bun test"),
  );
  if (failingTestStageLine && !NON_ZERO_EXIT_PATTERN.test(failingTestStageLine)) {
    issues.push("Failing-test stage violated: bun test must exit non-zero before implementation");
  }

  const staleVerification = lines.filter(
    (line) => line.startsWith("[verify] evidence ") && /\b(previous-run|stale)\b/.test(line),
  );
  if (staleVerification.length > 0) {
    issues.push(`Stale verification evidence: ${staleVerification.join("; ")}`);
  }

  return {
    valid: issues.length === 0,
    stages,
    issues,
  };
}

export async function scaffoldExecutableWorkflowHarness(
  config: ExecutableWorkflowHarnessConfig = {},
): Promise<ExecutableWorkflowScaffold> {
  const resolvedConfig = resolveHarnessConfig(config);
  const repoDir = await mkdtemp(join(tmpdir(), "executable-workflow-harness-"));

  const files = {
    packageJson: join(repoDir, "package.json"),
    ...(resolvedConfig.promptFile
      ? { prompt: join(repoDir, resolvedConfig.promptFile.file) }
      : {}),
    plan: join(repoDir, "plans", `${resolvedConfig.planId}.md`),
    implementation: join(repoDir, resolvedConfig.sample.implementationFile),
    reviewSpec: join(repoDir, resolvedConfig.sample.reviewSpecFile),
    reviewQuality: join(repoDir, resolvedConfig.sample.reviewQualityFile),
    test: join(repoDir, resolvedConfig.sample.testFile),
    transcript: join(repoDir, resolvedConfig.sample.transcriptFile),
  };

  await Promise.all(
    [
      dirname(files.plan),
      ...(files.prompt ? [dirname(files.prompt)] : []),
      dirname(files.implementation),
      dirname(files.reviewSpec),
      dirname(files.reviewQuality),
      dirname(files.test),
      dirname(files.transcript),
    ].map((dir) => mkdir(dir, { recursive: true })),
  );

  await writeFile(
    files.packageJson,
    JSON.stringify(
      {
        name: "executable-workflow-harness-fixture",
        private: true,
        type: "module",
        packageManager: `bun@${Bun.version}`,
        scripts: {
          test: "bun test",
        },
      },
      null,
      2,
    ),
  );
  await writeFile(
    files.plan,
      resolvedConfig.content.plan ??
      createPlanContent(
        resolvedConfig.planId,
        resolvedConfig.taskId,
        resolvedConfig.archetype,
        resolvedConfig.variant,
      ),
  );
  if (files.prompt && resolvedConfig.promptFile) {
    await writeFile(files.prompt, resolvedConfig.promptFile.content);
  }
  await writeFile(
    files.reviewSpec,
    resolvedConfig.content.reviewSpec ??
      createReviewSpecContent(
        resolvedConfig.planId,
        resolvedConfig.sample.testFile,
        resolvedConfig.variant,
      ),
  );
  await writeFile(
    files.reviewQuality,
      resolvedConfig.content.reviewQuality ??
      createReviewQualityContent(
        resolvedConfig.sample.implementationFile,
        resolvedConfig.sample.testFile,
        resolvedConfig.archetype,
      ),
  );
  await writeFile(
    files.test,
    resolvedConfig.content.test ??
      createTestContent(
        resolvedConfig.sample.testFile,
        resolvedConfig.sample.implementationFile,
        resolvedConfig.archetype,
      ),
  );
  await writeFile(files.transcript, "");

  return { repoDir, files };
}

export async function runExecutableWorkflowHarness(
  config: ExecutableWorkflowHarnessConfig = {},
): Promise<ExecutableWorkflowRunResult> {
  const resolvedConfig = resolveHarnessConfig(config);
  const scaffold = await scaffoldExecutableWorkflowHarness(resolvedConfig);

  const failingTest = await runBunTest(scaffold.repoDir);
  await writeFile(
    scaffold.files.implementation,
    resolvedConfig.content.implementation ??
      createImplementationContent(resolvedConfig.sample.implementationFile, resolvedConfig.archetype),
  );
  const reviewSpecAttempts = [
    await runBunCommand(scaffold.repoDir, [resolvedConfig.sample.reviewSpecFile]),
  ];
  const transcriptLines = [
    "[state] repo-scaffolded",
    ...(scaffold.files.prompt ? [`[prompt] scaffolded ${scaffold.files.prompt}`] : []),
    "[plan] status: approved",
    `[plan] file: ${scaffold.files.plan}`,
    `[tdd] failing test observed command=bun test exit=${failingTest.exitCode}`,
    `[impl] wrote ${resolvedConfig.sample.implementationFile}`,
    `[review-spec] command=bun ${resolvedConfig.sample.reviewSpecFile} exit=${reviewSpecAttempts[0]!.exitCode} evidence-sha256=${createEvidenceSha(reviewSpecAttempts[0]!.stdout)}`,
    ...(scaffold.files.prompt && reviewSpecAttempts[0]!.stdout.includes('"promptVisible":true')
      ? ["[prompt] consumed-by=review-spec"]
      : []),
  ];

  if (resolvedConfig.variant === "review-spec-recovery" && reviewSpecAttempts[0]!.exitCode !== 0) {
    await writeFile(
      scaffold.files.plan,
      `${await Bun.file(scaffold.files.plan).text()}- Recovery marker: review-spec-ready\n`,
    );
    transcriptLines.push("[fix] applied review-spec-recovery");
    reviewSpecAttempts.push(
      await runBunCommand(scaffold.repoDir, [resolvedConfig.sample.reviewSpecFile]),
    );
    transcriptLines.push(
      `[review-spec] command=bun ${resolvedConfig.sample.reviewSpecFile} exit=${reviewSpecAttempts[1]!.exitCode} evidence-sha256=${createEvidenceSha(reviewSpecAttempts[1]!.stdout)}`,
    );
    if (scaffold.files.prompt && reviewSpecAttempts[1]!.stdout.includes('"promptVisible":true')) {
      transcriptLines.push("[prompt] consumed-by=review-spec");
    }
  }

  const reviewSpec = reviewSpecAttempts.at(-1)!;
  const reviewQuality = await runBunCommand(scaffold.repoDir, [resolvedConfig.sample.reviewQualityFile]);
  const verification = await runBunTest(scaffold.repoDir);

  const transcript = [
    ...transcriptLines,
    `[review-quality] command=bun ${resolvedConfig.sample.reviewQualityFile} exit=${reviewQuality.exitCode} evidence-sha256=${createEvidenceSha(reviewQuality.stdout)}`,
    ...(scaffold.files.prompt && reviewQuality.stdout.includes('"promptVisible":true')
      ? ["[prompt] consumed-by=review-quality"]
      : []),
    `[verify] evidence source=current-run command=bun test exit=${verification.exitCode} stdout-sha256=${createEvidenceSha(verification.stdout)}`,
  ].join("\n");

  await writeFile(scaffold.files.transcript, `${transcript}\n`);

  return {
    ...scaffold,
    createdFiles: await listCreatedFiles(scaffold.repoDir),
    transcript: `${transcript}\n`,
    failingTest,
    reviewSpec,
    reviewQuality,
    verification,
    validation: evaluateExecutableWorkflowTranscript(transcript),
  };
}

async function main() {
  const result = await runExecutableWorkflowHarness();
  console.log(`[executable-workflow] repo=${result.repoDir}`);
  console.log(`[executable-workflow] validation=${result.validation.valid ? "PASS" : "FAIL"}`);

  if (!result.validation.valid || result.verification.exitCode !== 0) {
    for (const line of formatExecutableWorkflowFailureContext(result)) {
      console.log(line);
    }
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
