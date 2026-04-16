# Worktree Cleanup Guide

## Safe cleanup flow

1. confirm the branch is merged or no longer needed
2. inspect worktree status
3. remove with `agentic worktree remove --path <path>`
4. use `--force` only when the user explicitly accepts losing uncommitted changes
