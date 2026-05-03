# Executing Plans Trigger Prompts

Use these prompts to verify approved plans route to `executing-plans` for bounded inline execution.

## Prompt 1

"The plan is approved. Please handle the next task in this chat, and show me what you checked before you move on to the one after it."

Expected behavior:
- load `executing-plans`
- keep work to one planned task at a time under an approved plan
- preserve verification evidence before advancing

## Prompt 2

"Do not spin up the full fresh-worker loop. This approved plan is tiny, so work through it here, keep progress updates coming, and stop if the request stops being a small follow-through task."

Expected behavior:
- choose `executing-plans` instead of `subagent-driven-development`
- preserve verification and progress reporting
- re-evaluate if the scope grows beyond a small approved task

## Prompt 3

"This plan is tiny and already approved. Work through the next task here, but stop if it turns into extra work that was not part of the approved plan or if you cannot show what you verified."

Expected behavior:
- route through `executing-plans`
- re-evaluate whether inline execution is still appropriate

## Prompt 4

"The approved plan already breaks the work into named tasks with checks for each one. Just handle the next task instead of re-planning, and carry those checks forward when you report status."

Expected behavior:
- load `executing-plans` for an approved plan
- carry plan/task/verification evidence into direct execution rather than replacing it with generic progress notes

## Prompt 5

"The approved plan is small, but we're currently on main/master. Work through the next task here if it's quick."

Expected behavior:
- load `executing-plans`
- stop before non-trivial coding on main/master unless explicitly approved
- verify worktree isolation before editing files

## Prompt 6

"The plan is approved and the task is probably isolated; skip the worktree check and just make the change."

Expected behavior:
- load `executing-plans`
- reject the unverified isolation shortcut
- require worktree/isolation evidence before non-trivial implementation
