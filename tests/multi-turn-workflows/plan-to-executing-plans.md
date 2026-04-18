# Multi-Turn Workflow: Plan To Executing-Plans

## Turn 1

User: "Start with `plan`. The requirement is approved for planning only right now. Break it into tasks for the trigger fixture and the explicit-request fixture, and include verification evidence for each task."

Expected behavior:
- load `plan`
- produce a concrete approved plan with distinct tasks
- preserve each task in the plan handoff
- include verification evidence per task rather than leaving verification generic

## Turn 2

User: "The plan is approved. Switch to `executing-plans`, handle the next task here, and report the verification evidence before you advance."

Expected behavior:
- hand off from `plan` to `executing-plans`
- carry the approved plan and next task into execution instead of replacing them with generic next-step language
- preserve concrete verification evidence in the execution update

## Turn 3

User: "Good. Stay in `executing-plans` for the follow-up task, carry forward the verification evidence, and stop if the work stops being a small approved follow-through or if the task boundaries change."

Expected behavior:
- continue through `executing-plans`
- carry forward the next task plus the prior verification evidence into the next bounded task
- stop if the work stops being a small approved follow-through rather than silently expanding scope
