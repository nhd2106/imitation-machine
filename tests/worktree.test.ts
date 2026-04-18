import { describe, expect, test } from "bun:test";
import { access, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseWorktreePorcelain } from "../cli/commands/worktree";

const ROOT = process.cwd();

type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

async function run(command: string[], cwd: string, env?: Record<string, string>): Promise<CommandResult> {
  const proc = Bun.spawn(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      ...env,
    },
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
}

async function runOk(command: string[], cwd: string, env?: Record<string, string>): Promise<CommandResult> {
  const result = await run(command, cwd, env);
  expect(result.exitCode).toBe(0);
  return result;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function createRepoFixture(prefix: string): Promise<{
  tempDir: string;
  repoDir: string;
  remoteDir: string;
}> {
  const tempDir = await mkdtemp(join(tmpdir(), prefix));
  const repoDir = join(tempDir, "repo");
  const remoteDir = join(tempDir, "remote.git");

  await mkdir(repoDir, { recursive: true });
  await runOk(["git", "init", "--bare", remoteDir], tempDir);
  await runOk(["git", "init", "--initial-branch=main"], repoDir);
  await runOk(["git", "config", "user.name", "Test User"], repoDir);
  await runOk(["git", "config", "user.email", "test@example.com"], repoDir);

  await writeFile(join(repoDir, "README.md"), "base\n");
  await runOk(["git", "add", "README.md"], repoDir);
  await runOk(["git", "commit", "-m", "initial commit"], repoDir);
  await runOk(["git", "remote", "add", "origin", remoteDir], repoDir);
  await runOk(["git", "push", "-u", "origin", "main"], repoDir);

  return { tempDir, repoDir, remoteDir };
}

async function createFeatureWorktree(
  repoDir: string,
  branch: string,
  worktreeDir: string,
  options?: { push?: boolean; mergeIntoMain?: boolean },
): Promise<void> {
  await runOk(["git", "worktree", "add", "-b", branch, worktreeDir, "main"], repoDir);
  await writeFile(join(worktreeDir, "feature.txt"), `${branch}\n`);
  await runOk(["git", "add", "feature.txt"], worktreeDir);
  await runOk(["git", "commit", "-m", `add ${branch}`], worktreeDir);

  if (options?.push) {
    await runOk(["git", "push", "-u", "origin", branch], worktreeDir);
  }

  if (options?.mergeIntoMain) {
    await runOk(["git", "merge", "--no-ff", branch, "-m", `merge ${branch}`], repoDir);
    await runOk(["git", "push"], repoDir);
  }
}

async function runWorktreeCli(args: string[], dbPath: string): Promise<CommandResult> {
  return run([process.execPath, "cli/index.ts", "worktree", ...args], ROOT, {
    AGENTIC_DB_PATH: dbPath,
  });
}

describe("worktree command", () => {
  test("parseWorktreePorcelain parses multiple entries", () => {
    const output = [
      "worktree /repo",
      "HEAD 1a2b3c4d",
      "branch refs/heads/main",
      "",
      "worktree /repo/.worktrees/feat-x",
      "HEAD 5e6f7a8b",
      "branch refs/heads/feat/x",
      "",
      "worktree /repo/.worktrees/detached",
      "HEAD 9a0b1c2d",
      "detached",
    ].join("\n");

    const entries = parseWorktreePorcelain(output);

    expect(entries).toHaveLength(3);
    expect(entries[0]?.worktree).toBe("/repo");
    expect(entries[0]?.branch).toBe("main");
    expect(entries[1]?.branch).toBe("feat/x");
    expect(entries[2]?.detached).toBe(true);
    expect(entries[2]?.branch).toBeUndefined();
  });

  test("remove deletes a merged local branch after removing its worktree", async () => {
    const { tempDir, repoDir } = await createRepoFixture("agentic-worktree-merged-");
    const branch = "feat/merged-local";
    const worktreeDir = join(repoDir, ".worktrees", "merged-local");

    await createFeatureWorktree(repoDir, branch, worktreeDir, { mergeIntoMain: true });

    const result = await runWorktreeCli(
      ["remove", "--cwd", repoDir, "--path", worktreeDir, "--delete-branch"],
      join(tempDir, "state.db"),
    );

    expect(result.exitCode).toBe(0);
    expect(await pathExists(worktreeDir)).toBe(false);

    const branchList = await runOk(["git", "branch", "--list", branch], repoDir);
    expect(branchList.stdout.trim()).toBe("");
  });

  test("remove keeps the worktree in place when asked to delete an unmerged branch", async () => {
    const { tempDir, repoDir } = await createRepoFixture("agentic-worktree-unmerged-");
    const branch = "feat/not-merged";
    const worktreeDir = join(repoDir, ".worktrees", "not-merged");

    await createFeatureWorktree(repoDir, branch, worktreeDir);

    const result = await runWorktreeCli(
      ["remove", "--cwd", repoDir, "--path", worktreeDir, "--delete-branch"],
      join(tempDir, "state.db"),
    );

    expect(result.exitCode).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("merged");
    expect(await pathExists(worktreeDir)).toBe(true);

    const branchList = await runOk(["git", "branch", "--list", branch], repoDir);
    expect(branchList.stdout).toContain(branch);
  });

  test("remove refuses local branch deletion for a pushed but unmerged upstream branch", async () => {
    const { tempDir, repoDir } = await createRepoFixture("agentic-worktree-upstream-unmerged-");
    const branch = "feat/upstream-unmerged";
    const worktreeDir = join(repoDir, ".worktrees", "upstream-unmerged");

    await createFeatureWorktree(repoDir, branch, worktreeDir, { push: true });

    const result = await runWorktreeCli(
      ["remove", "--cwd", repoDir, "--path", worktreeDir, "--delete-branch"],
      join(tempDir, "state.db"),
    );

    expect(result.exitCode).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("not merged");
    expect(await pathExists(worktreeDir)).toBe(true);

    const branchList = await runOk(["git", "branch", "--list", branch], repoDir);
    expect(branchList.stdout).toContain(branch);
  });

  test("remove leaves the remote branch alone unless remote deletion is explicit", async () => {
    const { tempDir, repoDir } = await createRepoFixture("agentic-worktree-remote-default-");
    const branch = "feat/remote-kept";
    const worktreeDir = join(repoDir, ".worktrees", "remote-kept");

    await createFeatureWorktree(repoDir, branch, worktreeDir, { push: true, mergeIntoMain: true });

    const result = await runWorktreeCli(
      ["remove", "--cwd", repoDir, "--path", worktreeDir, "--delete-branch"],
      join(tempDir, "state.db"),
    );

    expect(result.exitCode).toBe(0);

    const remoteHeads = await runOk(["git", "ls-remote", "--heads", "origin", branch], repoDir);
    expect(remoteHeads.stdout).toContain(`refs/heads/${branch}`);
  });

  test("remove refuses remote deletion unless local branch deletion is also explicitly requested", async () => {
    const { tempDir, repoDir } = await createRepoFixture("agentic-worktree-remote-contract-");
    const branch = "feat/remote-contract";
    const worktreeDir = join(repoDir, ".worktrees", "remote-contract");

    await createFeatureWorktree(repoDir, branch, worktreeDir, { push: true, mergeIntoMain: true });

    const result = await runWorktreeCli(
      ["remove", "--cwd", repoDir, "--path", worktreeDir, "--delete-remote"],
      join(tempDir, "state.db"),
    );

    expect(result.exitCode).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("--delete-branch");
    expect(await pathExists(worktreeDir)).toBe(true);

    const localBranch = await runOk(["git", "branch", "--list", branch], repoDir);
    expect(localBranch.stdout).toContain(branch);

    const remoteHeads = await runOk(["git", "ls-remote", "--heads", "origin", branch], repoDir);
    expect(remoteHeads.stdout).toContain(`refs/heads/${branch}`);
  });

  test("remove deletes the remote branch only when explicitly requested", async () => {
    const { tempDir, repoDir } = await createRepoFixture("agentic-worktree-remote-");
    const branch = "feat/merged-remote";
    const worktreeDir = join(repoDir, ".worktrees", "merged-remote");

    await createFeatureWorktree(repoDir, branch, worktreeDir, { push: true, mergeIntoMain: true });

    const result = await runWorktreeCli(
      ["remove", "--cwd", repoDir, "--path", worktreeDir, "--delete-branch", "--delete-remote"],
      join(tempDir, "state.db"),
    );

    expect(result.exitCode).toBe(0);

    const remoteHeads = await runOk(["git", "ls-remote", "--heads", "origin", branch], repoDir);
    expect(remoteHeads.stdout.trim()).toBe("");
  });

  test("cleanup-merged --json previews merged cleanup candidates without deleting anything", async () => {
    const { tempDir, repoDir } = await createRepoFixture("agentic-worktree-cleanup-preview-");
    const branch = "feat/cleanup-preview";
    const worktreeDir = join(repoDir, ".worktrees", "cleanup-preview");

    await createFeatureWorktree(repoDir, branch, worktreeDir, { mergeIntoMain: true });

    const result = await runWorktreeCli(
      ["cleanup-merged", "--cwd", repoDir, "--json"],
      join(tempDir, "state.db"),
    );

    expect(result.exitCode).toBe(0);
    expect(await pathExists(worktreeDir)).toBe(true);

    const payload = JSON.parse(result.stdout) as {
      candidates: Array<{ path: string; branch: string }>;
      blockers: Array<{ path: string; reason: string }>;
    };

    expect(
      payload.candidates.some(
        (entry) => entry.path.endsWith("/.worktrees/cleanup-preview") && entry.branch === branch,
      ),
    ).toBe(true);
    expect(payload.blockers).toHaveLength(0);
  });

  test("cleanup-merged --apply removes only clean merged worktrees and their local branches", async () => {
    const { tempDir, repoDir } = await createRepoFixture("agentic-worktree-cleanup-apply-");
    const mergedBranch = "feat/cleanup-merged";
    const unmergedBranch = "feat/cleanup-unmerged";
    const mergedWorktreeDir = join(repoDir, ".worktrees", "cleanup-merged");
    const unmergedWorktreeDir = join(repoDir, ".worktrees", "cleanup-unmerged");

    await createFeatureWorktree(repoDir, mergedBranch, mergedWorktreeDir, { mergeIntoMain: true });
    await createFeatureWorktree(repoDir, unmergedBranch, unmergedWorktreeDir);

    const result = await runWorktreeCli(
      ["cleanup-merged", "--cwd", repoDir, "--apply"],
      join(tempDir, "state.db"),
    );

    expect(result.exitCode).toBe(0);
    expect(await pathExists(mergedWorktreeDir)).toBe(false);
    expect(await pathExists(unmergedWorktreeDir)).toBe(true);

    const mergedBranchList = await runOk(["git", "branch", "--list", mergedBranch], repoDir);
    const unmergedBranchList = await runOk(["git", "branch", "--list", unmergedBranch], repoDir);
    expect(mergedBranchList.stdout.trim()).toBe("");
    expect(unmergedBranchList.stdout).toContain(unmergedBranch);
  });

  test("cleanup-merged --apply --delete-remote deletes remote branches only when explicitly requested", async () => {
    const { tempDir, repoDir } = await createRepoFixture("agentic-worktree-cleanup-remote-");
    const keptBranch = "feat/cleanup-remote-kept";
    const keptWorktreeDir = join(repoDir, ".worktrees", "cleanup-remote-kept");
    const deletedBranch = "feat/cleanup-remote-deleted";
    const deletedWorktreeDir = join(repoDir, ".worktrees", "cleanup-remote-deleted");

    await createFeatureWorktree(repoDir, keptBranch, keptWorktreeDir, { push: true, mergeIntoMain: true });

    const previewOnly = await runWorktreeCli(
      ["cleanup-merged", "--cwd", repoDir, "--apply"],
      join(tempDir, "state-preview.db"),
    );

    expect(previewOnly.exitCode).toBe(0);
    const remoteStillThere = await runOk(["git", "ls-remote", "--heads", "origin", keptBranch], repoDir);
    expect(remoteStillThere.stdout).toContain(`refs/heads/${keptBranch}`);

    await createFeatureWorktree(repoDir, deletedBranch, deletedWorktreeDir, { push: true, mergeIntoMain: true });

    const deleteRemote = await runWorktreeCli(
      ["cleanup-merged", "--cwd", repoDir, "--apply", "--delete-remote"],
      join(tempDir, "state-delete.db"),
    );

    expect(deleteRemote.exitCode).toBe(0);
    const remoteGone = await runOk(["git", "ls-remote", "--heads", "origin", deletedBranch], repoDir);
    expect(remoteGone.stdout.trim()).toBe("");
  });

  test("cleanup-merged --apply --delete-remote fails fast on remote probe errors", async () => {
    const { tempDir, repoDir } = await createRepoFixture("agentic-worktree-cleanup-bad-remote-");
    const branch = "feat/bad-remote-merged";
    const worktreeDir = join(repoDir, ".worktrees", "bad-remote-merged");

    await createFeatureWorktree(repoDir, branch, worktreeDir, { mergeIntoMain: true });

    const result = await runWorktreeCli(
      ["cleanup-merged", "--cwd", repoDir, "--apply", "--delete-remote", "--remote", "does-not-exist"],
      join(tempDir, "state.db"),
    );

    expect(result.exitCode).toBe(128);
    expect(result.stderr.toLowerCase()).toContain("does-not-exist");
    expect(await pathExists(worktreeDir)).toBe(true);
  });

  test("cleanup-merged --apply --delete-remote skips local-only merged branches safely", async () => {
    const { tempDir, repoDir } = await createRepoFixture("agentic-worktree-cleanup-local-only-");
    const branch = "feat/local-only-merged";
    const worktreeDir = join(repoDir, ".worktrees", "local-only-merged");

    await createFeatureWorktree(repoDir, branch, worktreeDir, { mergeIntoMain: true });

    const result = await runWorktreeCli(
      ["cleanup-merged", "--cwd", repoDir, "--apply", "--delete-remote"],
      join(tempDir, "state.db"),
    );

    expect(result.exitCode).toBe(0);
    expect(await pathExists(worktreeDir)).toBe(false);
    const branchList = await runOk(["git", "branch", "--list", branch], repoDir);
    expect(branchList.stdout.trim()).toBe("");
  });

  test("cleanup-merged does not treat pushed but unmerged branches as merged candidates", async () => {
    const { tempDir, repoDir } = await createRepoFixture("agentic-worktree-cleanup-unmerged-");
    const branch = "feat/cleanup-pushed-unmerged";
    const worktreeDir = join(repoDir, ".worktrees", "cleanup-pushed-unmerged");

    await createFeatureWorktree(repoDir, branch, worktreeDir, { push: true });

    const result = await runWorktreeCli(
      ["cleanup-merged", "--cwd", repoDir, "--json"],
      join(tempDir, "state.db"),
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      candidates: Array<{ path: string; branch: string }>;
      blockers: Array<{ path: string; branch?: string; reason: string }>;
    };

    expect(payload.candidates.some((entry) => entry.branch === branch)).toBe(false);
    expect(
      payload.blockers.some(
        (entry) => entry.path.endsWith("/.worktrees/cleanup-pushed-unmerged") && entry.reason.includes("not merged"),
      ),
    ).toBe(true);
    expect(await pathExists(worktreeDir)).toBe(true);
  });

  test("cleanup-merged refuses conflicting --json and --apply modes", async () => {
    const { tempDir, repoDir } = await createRepoFixture("agentic-worktree-cleanup-conflict-");

    const result = await runWorktreeCli(
      ["cleanup-merged", "--cwd", repoDir, "--json", "--apply"],
      join(tempDir, "state.db"),
    );

    expect(result.exitCode).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("mutually exclusive");
  });

  test("cleanup-merged --apply still reports blockers after successful cleanup", async () => {
    const { tempDir, repoDir } = await createRepoFixture("agentic-worktree-cleanup-blockers-");
    const mergedBranch = "feat/cleanup-blockers-merged";
    const mergedWorktreeDir = join(repoDir, ".worktrees", "cleanup-blockers-merged");
    const dirtyBranch = "feat/cleanup-blockers-dirty";
    const dirtyWorktreeDir = join(repoDir, ".worktrees", "cleanup-blockers-dirty");

    await createFeatureWorktree(repoDir, mergedBranch, mergedWorktreeDir, { mergeIntoMain: true });
    await createFeatureWorktree(repoDir, dirtyBranch, dirtyWorktreeDir, { mergeIntoMain: true });
    await writeFile(join(dirtyWorktreeDir, "dirty.txt"), "dirty\n");

    const result = await runWorktreeCli(
      ["cleanup-merged", "--cwd", repoDir, "--apply"],
      join(tempDir, "state.db"),
    );

    expect(result.exitCode).toBe(0);
    expect(await pathExists(mergedWorktreeDir)).toBe(false);
    expect(await pathExists(dirtyWorktreeDir)).toBe(true);
    expect(`${result.stdout}${result.stderr}`).toContain("blocked");
    expect(`${result.stdout}${result.stderr}`).toContain("uncommitted changes");
  });
});
