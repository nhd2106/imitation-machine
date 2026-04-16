# Worktree Routing Prompts

Use these prompts to verify non-trivial implementation work routes through `@worktree` before `@coder`.

## Prompt 1

"The plan is approved. Use an isolated workspace before coding starts."

Expected behavior:
- `@planner` decides whether isolation is needed
- `@worktree` verifies or creates workspace isolation
- `@coder` starts only after that

## Prompt 2

"This is a review-only task. Do not create a worktree unless necessary."

Expected behavior:
- skip `@worktree` if the task is truly read-only

## Prompt 3

"This is a non-trivial multi-file implementation. Keep main clean."

Expected behavior:
- use `@worktree` before `@coder`
