# Explicit Issue Slicing Requests

## Prompt 1

"Use `issue-slicing` explicitly to convert the approved requirements brief into read-only vertical issue drafts, not tracker tickets."

Expected behavior:
- load `issue-slicing`
- honor the explicit `issue-slicing` request as read-only vertical drafts and vertical-slice issue drafts
- keep issue drafts approval-gated before any tracker handoff

## Prompt 2

"Please use `issue-slicing` explicitly on this approved plan and label dependencies plus HITL or AFK classification for each slice."

Expected behavior:
- interpret this as an explicit `issue-slicing` request
- map dependencies across the sliced issue drafts
- classify each slice as HITL or AFK without starting implementation

## Prompt 3

"Use `issue-slicing` explicitly, but keep it read-only: no-tracker writes, no implementation, and wait for approval before handoff."

Expected behavior:
- honor the explicit read-only `issue-slicing` boundary
- preserve the no-tracker and no-implementation constraints
- require approval before handoff to `plan`, `@po`, tracker updates, or implementation
