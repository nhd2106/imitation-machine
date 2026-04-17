# Explicit Worktree Requests

## Prompt 1

"Use the worktree skill and set up an isolated branch for this multi-file change before coding starts."

Expected behavior:
- load `worktree`
- create or verify safe isolated workspace setup before implementation

## Prompt 2

"Use the worktree skill to clean up this merged branch, but check for uncommitted changes before removing anything."

Expected behavior:
- load `worktree`
- inspect status and merged-state before cleanup
- avoid force removal unless the user explicitly accepts data loss
