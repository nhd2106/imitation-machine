---
name: worktree
description: Use when isolating work on a branch, parallelizing risky changes, or avoiding direct implementation on the main branch by creating and managing dedicated worktrees
---

# Worktrees

Use worktrees to isolate implementation streams. They reduce branch drift, keep risky changes contained, and make parallel work safer.

## Overview

The goal is reliable isolation: choose the right directory, verify it is safe, then start from a clean baseline.

## When To Use

- starting a new requirement or plan branch
- isolating risky refactors from the main workspace
- running multiple work streams in parallel
- avoiding direct implementation on `main` or `master`

## Workflow

```dot
digraph worktree_flow {
  "Need isolated work" [shape=doublecircle];
  "Choose branch and base" [shape=box];
  "Choose safe worktree directory" [shape=box];
  "Verify directory safety" [shape=box];
  "Create worktree" [shape=box];
  "Run setup and baseline checks" [shape=box];
  "Implement inside worktree" [shape=box];
  "Is work merged or no longer needed?" [shape=diamond];
  "Inspect status" [shape=box];
  "Remove worktree safely" [shape=box];

  "Need isolated work" -> "Choose branch and base";
  "Choose branch and base" -> "Choose safe worktree directory";
  "Choose safe worktree directory" -> "Verify directory safety";
  "Verify directory safety" -> "Create worktree";
  "Create worktree" -> "Run setup and baseline checks";
  "Run setup and baseline checks" -> "Implement inside worktree";
  "Implement inside worktree" -> "Is work merged or no longer needed?";
  "Is work merged or no longer needed?" -> "Inspect status" [label="yes"];
  "Inspect status" -> "Remove worktree safely";
}
```

## Common Commands

```sh
agentic worktree create --branch feat/req-123 --base main
agentic worktree list
agentic worktree list --json
agentic worktree remove --path .worktrees/feat/req-123
```

## Rules

- prefer one requirement or plan per worktree
- do not implement directly on `main` or `master` unless explicitly approved
- verify project-local worktree directories are safely ignored before using them
- run setup and baseline validation before heavy implementation work
- inspect worktree status before removal
- use force removal only when the user accepts losing uncommitted work

## Safety Verification

For project-local worktree directories, verify they are ignored before trusting them.

If the baseline in the worktree is already failing, report that before starting implementation so new failures are not confused with existing ones.

## Red Flags

Stop if:

- you are about to work directly on `main` out of convenience
- you cannot explain which branch or plan a worktree belongs to
- you are creating a project-local worktree without checking ignore safety
- baseline checks already fail but you continue as if the branch were clean
- you are removing a worktree without checking for uncommitted changes
- multiple unrelated tasks are sharing one isolation branch

## Companion Files

- `references/worktree-checklist.md`
- `cleanup-guide.md`

## Runtime Agent

- In OpenCode, prefer `@worktree` to execute or verify workspace isolation before `@coder` starts non-trivial implementation.
