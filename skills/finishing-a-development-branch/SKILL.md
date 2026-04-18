---
name: finishing-a-development-branch
description: Use when implementation is done and a branch needs final verification, cleanup, and handoff before review or merge
---

# Finishing a Development Branch

## Overview

Finish the branch by proving it is handoff-ready, not by assuming recent progress is enough. A runtime agent can help gather evidence, but the controller must decide readiness.

## Workflow

1. Confirm the intended scope and what is explicitly deferred.
2. Run the branch through `references/branch-finish-checklist.md`.
3. Summarize what changed, how it was verified, and any open concerns in `branch-hand-off-template.md`.
4. If the branch is already merged, use the safe cleanup order: check for uncommitted changes, remove the worktree, delete the merged local branch, and delete the remote branch only if explicitly requested. For multiple merged worktrees, preview with `agentic worktree cleanup-merged --json` before using `--apply`.
5. Remove obvious loose ends that belong to this branch only.
6. Hand off with evidence, not memory.

## Red Flags

- Calling a branch done without fresh verification
- Cleaning up a merged branch without checking for uncommitted work first
- Mixing deferred follow-ups into the handoff summary
- Leaving unstated risk for the next reviewer to discover
- Asking a runtime agent to make merge-readiness decisions without evidence

## Companion Files

- `references/branch-finish-checklist.md`
- `branch-hand-off-template.md`
