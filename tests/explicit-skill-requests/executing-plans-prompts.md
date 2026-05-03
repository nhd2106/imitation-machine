# Explicit Executing-Plans Requests

## Prompt 1

"Use `executing-plans` explicitly. The plan is already approved, so handle the next task in this chat and keep the checks you ran attached to your progress update."

Expected behavior:
- load `executing-plans`
- honor the explicit `executing-plans` request for an approved plan
- preserve the approved plan's task and verification evidence while working inline

## Prompt 2

"Use `executing-plans` explicitly for this approved task instead of `subagent-driven-development`. I want you to work through it here, one planned task at a time, and stop if it stops being a small approved follow-through step."

Expected behavior:
- interpret this as an explicit request for `executing-plans`
- keep execution inline and bounded to one approved task at a time
- re-evaluate the approach rather than drifting into a broader workflow

## Prompt 3

"Use `executing-plans` explicitly. The approved plan is tiny, but we're on main/master, so verify worktree isolation before any non-trivial coding."

Expected behavior:
- load `executing-plans`
- honor the explicit isolation check before implementation
- stop on main/master unless the user explicitly approves that branch

## Prompt 4

"Use `executing-plans` explicitly and skip the worktree check because this task is probably isolated already."

Expected behavior:
- load `executing-plans`
- interpret unverified isolation as a stop condition
- require worktree evidence before non-trivial edits
