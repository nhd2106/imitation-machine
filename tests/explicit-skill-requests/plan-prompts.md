# Explicit Plan Requests

## Prompt 1

"Use the `plan` skill explicitly and break this approved requirement into atomic tasks. I do not want code yet; I want a plan I can review."

Expected behavior:
- load `plan`
- honor the explicit `plan` request before coding
- produce file-specific, verifiable tasks

## Prompt 2

"I already approved the requirement. Use `plan` explicitly and write the implementation plan now instead of brainstorming again or jumping into code."

Expected behavior:
- interpret this as an explicit request for `plan`
- move to planning rather than brainstorming or coding
