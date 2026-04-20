import { join } from "node:path";

const INSTALL_USAGE = `
agentic install — Install local development integrations

USAGE
  agentic install local [--surface <opencode|claude|codex|all>] [--dry-run]

OPTIONS
  --surface  Choose which local install scripts to run (default: supported packaged surfaces; use codex explicitly)
  --dry-run  Print script path(s) without executing them
`.trim();

const SCRIPT_PATHS = {
  opencode: join(import.meta.dir, "..", "..", "scripts", "install-local-opencode.sh"),
  claude: join(import.meta.dir, "..", "..", "scripts", "install-local-claude-plugin.sh"),
  codex: join(import.meta.dir, "..", "..", "scripts", "install-local-codex.sh"),
} as const;

type Surface = "opencode" | "claude" | "codex" | "all";

export async function installCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(INSTALL_USAGE);
    return;
  }

  const subcommand = args[0];
  if (subcommand !== "local") {
    return exitWithInstallUsage(`Unknown install subcommand: ${subcommand}`);
  }

  let scriptPaths: InstallScript[];

  try {
    validateLocalArgs(args.slice(1));
    const surface = getSurface(getFlag(args, "--surface") ?? "all");
    scriptPaths = resolveScriptPaths(surface);
  } catch (error) {
    return exitWithInstallUsage(error instanceof Error ? error.message : String(error));
  }

  if (args.includes("--dry-run")) {
    for (const script of scriptPaths) {
      console.log(`${script.label}: ${script.path}`);
    }
    return;
  }

  for (const script of scriptPaths) {
    const proc = Bun.spawn(["bash", script.path], {
      cwd: process.cwd(),
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  }
}

type InstallScript = {
  label: keyof typeof SCRIPT_PATHS;
  path: string;
};

function validateLocalArgs(args: string[]): void {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;

    if (arg === "--dry-run") {
      continue;
    }

    if (arg === "--surface") {
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option for install local: ${arg}`);
    }
  }
}

function resolveScriptPaths(surface: Surface): InstallScript[] {
  if (surface === "all") {
    return [
      { label: "opencode", path: SCRIPT_PATHS.opencode },
      { label: "claude", path: SCRIPT_PATHS.claude },
    ];
  }

  return [{ label: surface, path: SCRIPT_PATHS[surface] }];
}

function getSurface(value: string): Surface {
  if (value === "opencode" || value === "claude" || value === "codex" || value === "all") {
    return value;
  }

  throw new Error(`Unsupported --surface value: ${value}. Expected opencode, claude, codex, or all.`);
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

function exitWithInstallUsage(message: string): never {
  console.error(message);
  console.error();
  console.error(INSTALL_USAGE);
  process.exit(1);
}
