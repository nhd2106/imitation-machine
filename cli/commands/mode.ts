import {
  clearProjectModeOverride,
  describeModeSource,
  getModePolicy,
  getModeOverrideStorePath,
  getRelevantModePath,
  resolveProjectMode,
  writeProjectModeOverride,
} from "../mode";

const MODE_USAGE = `
agentic mode — Resolve or override project mode

USAGE
  agentic mode show [--cwd <path>]
  agentic mode lite [--cwd <path>]
  agentic mode standard [--cwd <path>]
  agentic mode strict [--cwd <path>]
  agentic mode clear [--cwd <path>]

PRECEDENCE
  project override > repo config > fallback standard

MODES
  lite      Allows bash and file writes after bootstrap.
  standard  Allows bash after bootstrap, but still requires a workflow skill before file writes.
  strict    Requires a workflow skill before bash or file writes.

NOTES
  Overrides are stored outside the repo and stay active until you run \`agentic mode clear\`.
`.trim();

export async function modeCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(MODE_USAGE);
    process.exit(0);
  }

  const subcommand = args[0];
  const cwd = getFlag(args, "--cwd") ?? process.cwd();
  const storePath = getModeOverrideStorePath();

  if (subcommand === "show") {
    const resolved = await resolveProjectMode({ projectRoot: cwd, storePath });
    printModeResolution(resolved);
    process.exit(0);
  }

  if (subcommand === "clear") {
    const cleared = await clearProjectModeOverride({ projectRoot: cwd, storePath });
    const resolved = await resolveProjectMode({ projectRoot: cwd, storePath });
    if (cleared) {
      console.log(`Cleared the per-project mode override for ${resolved.projectRoot}.`);
    } else {
      console.log(`No valid per-project mode override was set for ${resolved.projectRoot}.`);
    }
    console.log(`Run \`agentic mode show --cwd ${resolved.projectRoot}\` to confirm the effective mode.`);
    printModeResolution(resolved);
    process.exit(0);
  }

  if (subcommand === "lite" || subcommand === "standard" || subcommand === "strict") {
    await writeProjectModeOverride({ projectRoot: cwd, mode: subcommand, storePath });
    const resolved = await resolveProjectMode({ projectRoot: cwd, storePath });
    console.log(`Saved a per-project mode override: ${subcommand} for ${resolved.projectRoot}.`);
    console.log(`Run \`agentic mode show --cwd ${resolved.projectRoot}\` to confirm the effective mode.`);
    printModeResolution(resolved);
    process.exit(0);
  }

  console.error(`Unknown mode subcommand: ${subcommand}\n`);
  console.log(MODE_USAGE);
  process.exit(1);
}

function getFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value;
}

function printModeResolution(resolved: Awaited<ReturnType<typeof resolveProjectMode>>): void {
  for (const warning of resolved.warnings) {
    console.warn(`Warning: ${warning}`);
  }

  console.log(`Project: ${resolved.projectRoot}`);
  console.log(`Effective mode: ${resolved.mode}`);
  console.log(`Source: ${describeModeSource(resolved)}`);
  console.log(`Relevant path: ${getRelevantModePath(resolved)}`);
  console.log(`In practice: ${getModePolicy(resolved.mode).summary}`);
  console.log("To change it: agentic mode lite|standard|strict [--cwd <path>]");
  if (resolved.source === "override") {
    console.log("To revert to the repo default or fallback: agentic mode clear [--cwd <path>]");
  }
}
