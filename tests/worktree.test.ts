import { describe, expect, test } from "bun:test";
import { parseWorktreePorcelain } from "../cli/commands/worktree";

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
});
