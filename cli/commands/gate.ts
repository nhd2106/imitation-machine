import type { GateContext, GateName, GateResult } from "../../gates/types";
import { persistGateResult } from "../../gates/persist";
import * as coverageGate from "../../gates/coverage";
import * as typecheckGate from "../../gates/typecheck";
import * as secretsGate from "../../gates/security-secrets";
import * as sastGate from "../../gates/security-sast";
import * as specGate from "../../gates/spec";
import * as qualityGate from "../../gates/quality";
import * as planGate from "../../gates/plan";

const GATE_USAGE = `
agentic gate — Run quality gates

USAGE
  agentic gate <gate> [--ref <ref>] [--cwd <path>] [options]
  agentic gate all   [--ref <ref>] [--cwd <path>]
  agentic gate record <spec|quality> --ref <task-id> (--pass|--fail) [--detail <message>] [--severity <info|warn|error>]

GATES
  coverage          Line coverage must be >= 80%
  typecheck         TypeScript must compile with 0 errors
  security-secrets  No secrets in source files
  security-sast     No critical SAST findings
  spec <ref>        Spec compliance review must exist and pass
  quality <ref>     Code quality review must exist and pass (requires spec pass)
  plan --planPath   Plan file must have no placeholders
  record            Manually record Stage 1/2 review outcomes (spec/quality)
  all               Run coverage + typecheck + security-secrets + security-sast
`.trim();

const MERGE_GATES: GateName[] = ["coverage", "typecheck", "security-secrets", "security-sast"];

function printResult(result: GateResult): void {
  const icon = result.passed ? "✓" : "✗";
  const label = result.passed ? "PASS" : "FAIL";
  console.log(`\n${icon} [${label}] ${result.name} (${result.durationMs}ms)`);
  for (const detail of result.details) {
    const prefix = detail.severity === "error" ? "  ✗" : detail.severity === "warn" ? "  ⚠" : "  •";
    const loc = detail.location ? ` (${detail.location})` : "";
    console.log(`${prefix} ${detail.message}${loc}`);
  }
}

export async function gateCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(GATE_USAGE);
    return;
  }

  const cwd = getFlag(args, "--cwd") ?? process.cwd();
  const ref = getFlag(args, "--ref") ?? (await getCurrentGitSha(cwd));
  const planPath = getFlag(args, "--planPath");
  const subcommand = args[0] as string;

  if (subcommand === "record") {
    await recordReviewGate(args.slice(1), ref);
    return;
  }

  const ctx: GateContext = { ref, cwd, options: planPath ? { planPath } : {} };

  if (subcommand === "all") {
    const results: GateResult[] = [];
    for (const name of MERGE_GATES) {
      const result = await runGate(name, ctx);
      persistGateResult(result);
      printResult(result);
      results.push(result);
    }
    const allPassed = results.every((r) => r.passed);
    console.log(`\n${allPassed ? "✓ All gates passed" : "✗ Gates failed — merge blocked"}`);
    process.exit(allPassed ? 0 : 1);
    return;
  }

  const gateName = subcommand as GateName;
  const result = await runGate(gateName, ctx);
  persistGateResult(result);
  printResult(result);
  process.exit(result.passed ? 0 : 1);
}

async function recordReviewGate(args: string[], defaultRef: string): Promise<void> {
  const gate = args[0];
  if (gate !== "spec" && gate !== "quality") {
    console.error("Usage: agentic gate record <spec|quality> --ref <task-id> (--pass|--fail) [--detail <message>] [--severity <info|warn|error>]");
    process.exit(1);
  }

  const ref = getFlag(args, "--ref") ?? defaultRef;
  const markPass = args.includes("--pass");
  const markFail = args.includes("--fail");

  if (markPass === markFail) {
    console.error("Specify exactly one of --pass or --fail");
    process.exit(1);
  }

  const severityRaw = getFlag(args, "--severity");
  const severity = severityRaw === "warn" || severityRaw === "error" || severityRaw === "info"
    ? severityRaw
    : markPass
      ? "info"
      : "error";

  const detail = getFlag(args, "--detail") ?? `${gate} review ${markPass ? "passed" : "failed"}`;

  const result: GateResult = {
    name: gate,
    ref,
    passed: markPass,
    details: [{
      severity,
      message: detail,
    }],
    durationMs: 0,
  };

  persistGateResult(result);
  printResult(result);
  process.exit(markPass ? 0 : 1);
}

async function runGate(name: GateName, ctx: GateContext): Promise<GateResult> {
  switch (name) {
    case "coverage":        return coverageGate.run(ctx);
    case "typecheck":       return typecheckGate.run(ctx);
    case "security-secrets": return secretsGate.run(ctx);
    case "security-sast":   return sastGate.run(ctx);
    case "spec":            return specGate.run(ctx);
    case "quality":         return qualityGate.run(ctx);
    case "plan":            return planGate.run(ctx);
    default:
      throw new Error(`Unknown gate: ${name as string}`);
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
