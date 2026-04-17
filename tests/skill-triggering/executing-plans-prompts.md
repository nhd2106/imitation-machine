# Executing Plans Trigger Prompts

Use these prompts to verify approved-plan direct execution routes to `executing-plans`.

## Prompt 1

"The plan is approved. Execute the next task directly in this session and keep me posted after each task."

Expected behavior:
- load `executing-plans`
- keep work to one planned task at a time

## Prompt 2

"Do not spin up the full fresh-worker loop. Just work through this approved plan inline with progress updates."

Expected behavior:
- choose `executing-plans` instead of `subagent-driven-development`
- preserve verification and progress reporting

## Prompt 3

"This plan is tiny and already approved. Execute it directly, but stop if it stops being a narrow task."

Expected behavior:
- route through `executing-plans`
- re-evaluate whether the direct lane is still appropriate
