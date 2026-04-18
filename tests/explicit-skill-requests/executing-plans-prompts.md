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
