# Issue Slicing Trigger Prompts

Use these prompts to verify approved briefs or plans route to `issue-slicing` without tracker writes, planning handoff, or implementation.

## Prompt 1

"We approved the requirements brief for the intake cleanup; turn it into read-only vertical issue drafts before anyone opens tracker tickets."

Expected behavior:
- load `issue-slicing`
- create read-only vertical drafts and vertical-slice issue drafts from the approved brief
- keep the issue drafts unsubmitted until a human approves tracker handoff

## Prompt 2

"The plan is approved; slice the work into dependent issues and mark which ones need HITL review versus AFK execution."

Expected behavior:
- load `issue-slicing`
- identify dependencies between issue drafts from the approved plan
- classify each draft for HITL or AFK execution readiness without implementing

## Prompt 3

"Slice this approved scope but keep every uncertainty visible, and do not hand anything to plan, @po, or implementation until I approve the slices."

Expected behavior:
- load `issue-slicing`
- preserve uncertainty in the issue drafts instead of resolving it silently
- require approval before handoff to `plan`, `@po`, or any implementation workflow
