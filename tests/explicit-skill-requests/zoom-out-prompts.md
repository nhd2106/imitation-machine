# Explicit Zoom Out Requests

## Prompt 1

"Use `zoom-out` explicitly to zoom out from this task and explain the broader context before anyone changes code."

Expected behavior:
- load `zoom-out` because the request is explicit
- honor the explicit `zoom-out` request as read-only discovery and orientation
- summarize the surrounding modules, workflows, and unknowns before implementation

## Prompt 2

"Please use `zoom-out` explicitly as a read-only survey: inspect the module map, do not edit files, and make no changes."

Expected behavior:
- interpret this as an explicit `zoom-out` request
- keep the inspect and survey pass read-only with no changes and no edits
- return discovered boundaries, dependencies, and follow-up questions only

## Prompt 3

"Use `zoom-out` explicitly, but only to define the implementation boundary: tell me what would be a non-trigger and do not implement the refactor."

Expected behavior:
- honor the explicit `zoom-out` request while preserving the implementation boundary
- identify direct implementation, refactor, prototype, and architecture-decision prompts as non-trigger scenarios without read-only orientation
- do not implement or authorize edits from the discovery pass
