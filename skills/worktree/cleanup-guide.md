# Worktree Cleanup Guide

## Safe cleanup flow

1. confirm the branch or PR is merged before cleanup; if it is not merged, stop and keep the worktree
2. inspect worktree status for uncommitted changes; commit, stash, or abort cleanup unless the user explicitly approves `--force`
3. remove the worktree and delete the merged local branch with `agentic worktree remove --path <path> --delete-branch`
4. delete the remote branch only when the user explicitly asks for it: add `--delete-remote` and use `--remote <name>` if the remote is not `origin`
5. keep the cleanup order explicit: dirty-check first, worktree removal second, safe local branch deletion third, optional remote deletion last

## Notes

- `--delete-branch` is intentionally safe: it only supports merged-branch cleanup
- `--delete-remote` is optional and should happen only after the local cleanup path is already safe
- `--force` is for intentional data loss, not routine cleanup
