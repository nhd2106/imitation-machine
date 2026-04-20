#!/usr/bin/env bun

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
  install   Install local development integrations
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

  const [command, ...rest] = args as [string, ...string[]];

  if (command !== "install") {
    const { migrate } = await import("../db/migrate");
    await migrate();
  }

  switch (command) {
    case "gate":
      await (await import("./commands/gate")).gateCommand(rest);
      break;
    case "plan":
      await (await import("./commands/plan")).planCommand(rest);
      break;
    case "req":
    case "requirement":
      await (await import("./commands/requirement")).requirementCommand(rest);
      break;
    case "repo":
      await (await import("./commands/repo")).repoCommand(rest);
      break;
    case "audit":
      await (await import("./commands/audit")).auditCommand(rest);
      break;
    case "pr":
      await (await import("./commands/pr")).prCommand(rest);
      break;
    case "release":
      await (await import("./commands/release")).releaseCommand(rest);
      break;
    case "install":
      await (await import("./commands/install")).installCommand(rest);
      break;
    case "verify":
      await (await import("./commands/verify")).verifyCommand(rest);
      break;
    case "worktree":
      await (await import("./commands/worktree")).worktreeCommand(rest);
      break;
    case "orchestrate":
      await (await import("./commands/orchestrate")).orchestrateCommand(rest);
      break;
    case "check-plugin":
      await (await import("./commands/check-plugin")).checkPluginCommand(rest);
      break;
    case "mode":
      await (await import("./commands/mode")).modeCommand(rest);
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
