type VerifyRunResult = {
  success: boolean;
  exitCode: number;
  output: string;
};

export type VerificationCheck = {
  id: string;
  description: string;
  command: string[];
};

export type VerificationResult = {
  id: string;
  description: string;
  command: string;
  success: boolean;
  exitCode: number;
  output: string;
  durationMs: number;
};

const VERIFY_USAGE = `
agentic verify — Verification before completion

USAGE
  agentic verify all [--cwd <path>] [--ref <ref>] [--json]

CHECKS (all)
  1) Merge gates   -> agentic gate all
  2) Typecheck     -> bunx tsc --noEmit
  3) Test suite    -> bun test
`.trim();

export async function verifyCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(VERIFY_USAGE);
    return;
  }

  const subcommand = args[0];
  if (subcommand !== "all") {
    console.error(`Unknown verify subcommand: ${subcommand}`);
    process.exit(1);
  }

  const cwd = getFlag(args, "--cwd") ?? process.cwd();
  const ref = getFlag(args, "--ref") ?? (await getCurrentGitSha(cwd));
  const asJson = args.includes("--json");

  const checks = buildDefaultChecks(cwd, ref);
  const results = await runVerificationChecklist(checks, cwd);
  const passed = results.every((result) => result.success);

  if (asJson) {
    console.log(JSON.stringify({ passed, cwd, ref, results }, null, 2));
  } else {
    printVerificationResults(results);
    console.log(`\n${passed ? "✓ Verification passed" : "✗ Verification failed"}`);
  }

  process.exit(passed ? 0 : 1);
}

export async function runVerificationChecklist(
  checks: VerificationCheck[],
  cwd: string,
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  for (const check of checks) {
    const startedAt = Date.now();
    const result = await runCommand(check.command, cwd);
    results.push({
      id: check.id,
      description: check.description,
      command: check.command.join(" "),
      success: result.success,
      exitCode: result.exitCode,
      output: result.output,
      durationMs: Date.now() - startedAt,
    });
  }

  return results;
}

export function buildDefaultChecks(cwd: string, ref: string): VerificationCheck[] {
  return [
    {
      id: "merge-gates",
      description: "Run all merge gates",
      command: ["bun", "cli/index.ts", "gate", "all", "--cwd", cwd, "--ref", ref],
    },
    {
      id: "typecheck",
      description: "Run TypeScript typecheck",
      command: ["bunx", "tsc", "--noEmit"],
    },
    {
      id: "tests",
      description: "Run full test suite",
      command: ["bun", "test"],
    },
  ];
}

async function runCommand(command: string[], cwd: string): Promise<VerifyRunResult> {
  const proc = Bun.spawn(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return {
    success: exitCode === 0,
    exitCode,
    output: `${stdout}${stderr}`.trim(),
  };
}

function printVerificationResults(results: VerificationResult[]): void {
  for (const result of results) {
    const icon = result.success ? "✓" : "✗";
    console.log(`\n${icon} ${result.description} (${result.durationMs}ms)`);
    console.log(`  $ ${result.command}`);
    if (result.output) {
      for (const line of result.output.split("\n")) {
        console.log(`  ${line}`);
      }
    }
  }
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

async function getCurrentGitSha(cwd: string): Promise<string> {
  const proc = Bun.spawn(["git", "rev-parse", "--short", "HEAD"], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
  const sha = (await new Response(proc.stdout).text()).trim();
  return sha || "unknown";
}
