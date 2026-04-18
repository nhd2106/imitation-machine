# Explicit Worktree Requests

## Prompt 1

"Use the `worktree` skill explicitly and set up an isolated branch for this multi-file change before coding starts."

Expected behavior:
- load `worktree`
- create or verify safe isolated workspace setup before implementation

## Prompt 2

"Use the `worktree` skill explicitly to clean up this merged branch, but check for uncommitted changes before removing anything."

Expected behavior:
- load `worktree`
- honor the explicit `worktree` request for merged cleanup
- inspect status and merged-state before cleanup
- avoid force removal unless the user explicitly accepts data loss

## Prompt 3

"Use the `worktree` skill explicitly for merged cleanup: remove the worktree, delete the local branch, and ask before deleting the remote branch too."

Expected behavior:
- load `worktree`
- keep the local merged-branch cleanup path first-class
- treat remote branch deletion as optional and explicit
