import { realpath } from "node:fs/promises";
import { resolve } from "node:path";

type WorktreeRunResult = {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  output: string;
};

type CleanupCandidate = {
  path: string;
  branch: string;
  remote?: string;
};

type CleanupBlocker = {
  path: string;
  branch?: string;
  reason: string;
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
  agentic worktree remove --path <dir> [--force] [--delete-branch] [--delete-remote] [--remote <name>] [--cwd <path>]
  agentic worktree cleanup-merged [--cwd <path>] [--json] [--apply] [--delete-remote] [--remote <name>] [--force]
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
    case "cleanup-merged":
      await cleanupMergedWorktrees(args.slice(1), cwd);
      return;
    default:
      console.error(`Unknown worktree subcommand: ${subcommand}`);
      process.exit(1);
  }
}

async function cleanupMergedWorktrees(args: string[], cwd: string): Promise<void> {
  const asJson = args.includes("--json");
  const apply = args.includes("--apply");
  const deleteRemote = args.includes("--delete-remote");
  const force = args.includes("--force");
  const remote = getFlag(args, "--remote") ?? "origin";

  if (asJson && apply) {
    console.error("--json and --apply are mutually exclusive for cleanup-merged.");
    process.exit(1);
  }

  const summary = await summarizeMergedWorktrees(cwd, force, deleteRemote ? remote : undefined);

  if (asJson) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (!apply) {
    if (summary.candidates.length === 0) {
      console.log("No merged cleanup candidates found.");
    } else {
      for (const candidate of summary.candidates) {
        console.log(`candidate ${candidate.path} branch=${candidate.branch}`);
      }
    }

    for (const blocker of summary.blockers) {
      console.log(`blocked ${blocker.path}${blocker.branch ? ` branch=${blocker.branch}` : ""} reason=${blocker.reason}`);
    }
    return;
  }

  for (const candidate of summary.candidates) {
    await removeWorktree([
      "--path",
      candidate.path,
      "--delete-branch",
      ...(force ? ["--force"] : []),
      ...(deleteRemote && candidate.remote ? ["--delete-remote", "--remote", candidate.remote] : []),
    ], cwd);
  }

  if (summary.candidates.length === 0) {
    console.log("No merged cleanup candidates found.");
  }

  for (const blocker of summary.blockers) {
    console.log(`blocked ${blocker.path}${blocker.branch ? ` branch=${blocker.branch}` : ""} reason=${blocker.reason}`);
  }
}

async function summarizeMergedWorktrees(
  cwd: string,
  force: boolean,
  remote?: string,
): Promise<{ candidates: CleanupCandidate[]; blockers: CleanupBlocker[] }> {
  const result = await runGit(["worktree", "list", "--porcelain"], cwd);
  if (!result.success) outputOrExit(result);

  const currentPath = await canonicalPath(cwd);
  const candidates: CleanupCandidate[] = [];
  const blockers: CleanupBlocker[] = [];

  for (const entry of parseWorktreePorcelain(result.output)) {
    const entryPath = await canonicalPath(entry.worktree);
    if (entryPath === currentPath) continue;

    if (!entry.branch) {
      blockers.push({ path: entry.worktree, reason: "detached or bare worktree" });
      continue;
    }

    if (!force) {
      const status = await runGit(["-C", entry.worktree, "status", "--porcelain"], cwd);
      if (!status.success) outputOrExit(status);
      if (status.output.trim().length > 0) {
        blockers.push({ path: entry.worktree, branch: entry.branch, reason: "uncommitted changes" });
        continue;
      }
    }

    const merged = await isBranchMerged(entry.branch, cwd);
    if (!merged) {
      blockers.push({ path: entry.worktree, branch: entry.branch, reason: "branch not merged" });
      continue;
    }

    const remoteExists = remote ? await branchExistsOnRemote(entry.branch, remote, cwd) : false;
    candidates.push({ path: entry.worktree, branch: entry.branch, remote: remoteExists ? remote : undefined });
  }

  return { candidates, blockers };
}

async function branchExistsOnRemote(branch: string, remote: string, cwd: string): Promise<boolean> {
  const result = await runGit(["ls-remote", "--heads", remote, branch], cwd);
  if (!result.success) outputOrExit(result);
  return result.stdout.trim().length > 0;
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
  const deleteRemote = args.includes("--delete-remote");
  const deleteBranch = args.includes("--delete-branch");
  const remote = getFlag(args, "--remote") ?? "origin";

  if (!path) {
    console.error("Required: --path <dir>");
    process.exit(1);
  }

  if (deleteRemote && !deleteBranch) {
    console.error("--delete-remote requires --delete-branch so cleanup order stays explicit.");
    process.exit(1);
  }

  const absolutePath = resolve(cwd, path);
  const branch = deleteBranch ? await prepareBranchCleanup(absolutePath, cwd, force) : undefined;

  const gitArgs = ["worktree", "remove"];
  if (force) gitArgs.push("--force");
  gitArgs.push(path);

  const result = await runGit(gitArgs, cwd);
  if (!result.success) outputOrExit(result);

  if (branch) {
    outputOrExit(await runGit(["branch", "-d", branch], cwd));

    if (deleteRemote) {
      outputOrExit(await runGit(["push", remote, "--delete", branch], cwd));
    }
  }

  outputOrExit(result);
}

async function prepareBranchCleanup(path: string, cwd: string, force: boolean): Promise<string> {
  const worktree = await findWorktree(path, cwd);

  if (!worktree) {
    console.error(`No worktree found for path: ${path}`);
    process.exit(1);
  }

  if (!worktree.branch) {
    console.error("Cannot delete a branch for a detached worktree.");
    process.exit(1);
  }

  if (!force) {
    await assertWorktreeClean(path, cwd);
  }

  const merged = await isBranchMerged(worktree.branch, cwd);
  if (!merged) {
    console.error(`Refusing to remove ${path}: branch '${worktree.branch}' is not merged yet.`);
    process.exit(1);
  }

  return worktree.branch;
}

async function findWorktree(path: string, cwd: string): Promise<WorktreeEntry | undefined> {
  const result = await runGit(["worktree", "list", "--porcelain"], cwd);
  if (!result.success) outputOrExit(result);

  const target = await canonicalPath(path);

  for (const entry of parseWorktreePorcelain(result.output)) {
    if ((await canonicalPath(entry.worktree)) === target) {
      return entry;
    }
  }

  return undefined;
}

async function assertWorktreeClean(path: string, cwd: string): Promise<void> {
  const result = await runGit(["-C", path, "status", "--porcelain"], cwd);
  if (!result.success) outputOrExit(result);

  if (result.output.trim().length > 0) {
    console.error(`Refusing to remove ${path}: uncommitted changes detected. Commit, stash, or use --force.`);
    process.exit(1);
  }
}

async function isBranchMerged(branch: string, cwd: string): Promise<boolean> {
  const result = await runGit(["merge-base", "--is-ancestor", branch, "HEAD"], cwd);
  return result.success;
}

async function canonicalPath(path: string): Promise<string> {
  const absolutePath = resolve(path);

  try {
    return await realpath(absolutePath);
  } catch {
    return absolutePath;
  }
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
    stdout,
    stderr,
    output: `${stdout}${stderr}`.trim(),
  };
}

function outputOrExit(result: WorktreeRunResult): void {
  if (result.stdout.trim()) console.log(result.stdout.trim());
  if (result.stderr.trim()) console.error(result.stderr.trim());
  if (!result.success) process.exit(result.exitCode || 1);
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  return args[idx + 1];
}
