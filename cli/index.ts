#!/usr/bin/env bun
import { gateCommand } from "./commands/gate";
import { planCommand } from "./commands/plan";
import { requirementCommand } from "./commands/requirement";
import { repoCommand } from "./commands/repo";
import { auditCommand } from "./commands/audit";
import { prCommand } from "./commands/pr";
import { releaseCommand } from "./commands/release";
import { verifyCommand } from "./commands/verify";
import { worktreeCommand } from "./commands/worktree";
import { orchestrateCommand } from "./commands/orchestrate";
import { checkPluginCommand } from "./commands/check-plugin";
import { modeCommand } from "./commands/mode";
import { migrate } from "../db/migrate";

const VERSION = "0.1.0";

const USAGE = `
agentic — Enterprise Agentic Software-Dev Framework v${VERSION}

USAGE
  agentic <command> [subcommand] [flags]

COMMANDS
  gate      Run quality gates (coverage, typecheck, security, spec, quality, plan)
  plan      Manage implementation plans (new, verify, approve)
  req       Manage requirements (new, list, trace)
  repo      Mono-repo utilities (graph, affected, test, build)
  audit     Audit trail (trace, export)
  pr        Pull request operations (open, approve)
  release   Release operations (tag)
  verify    Verification before completion (gates + typecheck + tests)
  worktree  Worktree lifecycle (create, list, remove, cleanup-merged)
  orchestrate  Persona orchestration (run, status)
  check-plugin  Validate OpenCode and Claude plugin setup
  mode      Explain or override project mode (show, lite, standard, strict, clear)

FLAGS
  --help, -h     Show help
  --version, -v  Show version

Run \`agentic <command> --help\` for command-specific help.
Run \`agentic mode --help\` for mode precedence and override details.
`.trim();

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(USAGE);
    process.exit(0);
  }

  if (args[0] === "--version" || args[0] === "-v") {
    console.log(VERSION);
    process.exit(0);
  }

  // Ensure DB tables exist before any command
  await migrate();

  const [command, ...rest] = args as [string, ...string[]];

  switch (command) {
    case "gate":
      await gateCommand(rest);
      break;
    case "plan":
      await planCommand(rest);
      break;
    case "req":
    case "requirement":
      await requirementCommand(rest);
      break;
    case "repo":
      await repoCommand(rest);
      break;
    case "audit":
      await auditCommand(rest);
      break;
    case "pr":
      await prCommand(rest);
      break;
    case "release":
      await releaseCommand(rest);
      break;
    case "verify":
      await verifyCommand(rest);
      break;
    case "worktree":
      await worktreeCommand(rest);
      break;
    case "orchestrate":
      await orchestrateCommand(rest);
      break;
    case "check-plugin":
      await checkPluginCommand(rest);
      break;
    case "mode":
      await modeCommand(rest);
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(USAGE);
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
