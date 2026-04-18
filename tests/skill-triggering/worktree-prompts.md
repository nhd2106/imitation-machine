# Worktree Trigger Prompts

## Prompt 1

"This refactor is risky and I want it isolated from main in its own workspace."

Expected behavior:
- load `worktree`
- prefer isolated branch/worktree setup before implementation starts

## Prompt 2

"The PR was already merged. Help me safely remove the stale worktree and local branch without losing any leftover changes."

Expected behavior:
- load `worktree`
- verify merged-branch cleanup conditions before removal
- check for uncommitted work and avoid unsafe cleanup shortcuts

## Prompt 3

"This branch is merged and I want the full cleanup path: remove the worktree, delete the local branch, and only delete the origin branch if I explicitly confirm it."

Expected behavior:
- load `worktree`
- use the merged cleanup order instead of treating cleanup as a blind delete
- keep remote branch deletion optional and explicit
