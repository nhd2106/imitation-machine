type WorktreeRunResult = {
  success: boolean;
  exitCode: number;
  output: string;
};

export type WorktreeEntry = {
  worktree: string;
  head?: string;
  branch?: string;
  bare: boolean;
  detached: boolean;
};

const WORKTREE_USAGE = `
agentic worktree — Git worktree workflow

USAGE
  agentic worktree create --branch <name> [--base <ref>] [--path <dir>] [--cwd <path>]
  agentic worktree list [--cwd <path>] [--json]
  agentic worktree remove --path <dir> [--force] [--cwd <path>]
`.trim();

export async function worktreeCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(WORKTREE_USAGE);
    return;
  }

  const cwd = getFlag(args, "--cwd") ?? process.cwd();
  const subcommand = args[0];

  switch (subcommand) {
    case "create":
      await createWorktree(args.slice(1), cwd);
      return;
    case "list":
      await listWorktrees(args.slice(1), cwd);
      return;
    case "remove":
      await removeWorktree(args.slice(1), cwd);
      return;
    default:
      console.error(`Unknown worktree subcommand: ${subcommand}`);
      process.exit(1);
  }
}

export function parseWorktreePorcelain(output: string): WorktreeEntry[] {
  const entries: WorktreeEntry[] = [];
  const lines = output.split("\n").map((line) => line.trim()).filter(Boolean);

  let current: WorktreeEntry | null = null;
  for (const line of lines) {
    if (line.startsWith("worktree ")) {
      if (current) entries.push(current);
      current = {
        worktree: line.slice("worktree ".length),
        bare: false,
        detached: false,
      };
      continue;
    }

    if (!current) continue;

    if (line.startsWith("HEAD ")) {
      current.head = line.slice("HEAD ".length);
      continue;
    }

    if (line.startsWith("branch ")) {
      const raw = line.slice("branch ".length);
      current.branch = raw.replace("refs/heads/", "");
      continue;
    }

    if (line === "bare") {
      current.bare = true;
      continue;
    }

    if (line === "detached") {
      current.detached = true;
      continue;
    }
  }

  if (current) entries.push(current);
  return entries;
}

async function createWorktree(args: string[], cwd: string): Promise<void> {
  const branch = getFlag(args, "--branch");
  const base = getFlag(args, "--base") ?? "HEAD";
  const path = getFlag(args, "--path") ?? `.worktrees/${branch ?? ""}`;

  if (!branch) {
    console.error("Required: --branch <name>");
    process.exit(1);
  }

  const result = await runGit(["worktree", "add", "-b", branch, path, base], cwd);
  outputOrExit(result);
}

async function listWorktrees(args: string[], cwd: string): Promise<void> {
  const asJson = args.includes("--json");
  const result = await runGit(["worktree", "list", "--porcelain"], cwd);
  if (!result.success) outputOrExit(result);

  const entries = parseWorktreePorcelain(result.output);

  if (asJson) {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  if (entries.length === 0) {
    console.log("No worktrees found.");
    return;
  }

  for (const entry of entries) {
    const branch = entry.branch ?? "(detached)";
    const head = entry.head ?? "unknown";
    const traits = [entry.bare ? "bare" : "", entry.detached ? "detached" : ""].filter(Boolean).join(", ");
    console.log(`${entry.worktree}  branch=${branch}  head=${head}${traits ? `  ${traits}` : ""}`);
  }
}

async function removeWorktree(args: string[], cwd: string): Promise<void> {
  const path = getFlag(args, "--path");
  const force = args.includes("--force");

  if (!path) {
    console.error("Required: --path <dir>");
    process.exit(1);
  }

  const gitArgs = ["worktree", "remove"];
  if (force) gitArgs.push("--force");
  gitArgs.push(path);

  const result = await runGit(gitArgs, cwd);
  outputOrExit(result);
}

async function runGit(args: string[], cwd: string): Promise<WorktreeRunResult> {
  const proc = Bun.spawn(["git", ...args], {
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

function outputOrExit(result: WorktreeRunResult): void {
  if (result.output) console.log(result.output);
  if (!result.success) process.exit(result.exitCode || 1);
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  return args[idx + 1];
}
