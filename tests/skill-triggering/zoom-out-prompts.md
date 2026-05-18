# Zoom Out Trigger Prompts

Use these prompts to verify read-only orientation and discovery requests route to `zoom-out` without planning, implementation, or edits.

## Prompt 1

"Before we touch this feature, zoom out and give me the broader context so I understand the surrounding module and workflow."

Expected behavior:
- load `zoom-out` for read-only discovery before any implementation path
- orient on broader context, related modules, and the current workflow shape
- avoid planning, refactoring, or code changes while surveying the repo

## Prompt 2

"Map the module boundaries and neighboring entry points before change; I only want an orientation pass so we know what this area connects to."

Expected behavior:
- load `zoom-out` as an orientation and discovery trigger
- survey module boundaries, callers, and nearby workflows before recommending next steps
- keep the response read-only and do not edit files

## Prompt 3

"Inspect this repo area, survey the existing patterns, and discover the risks, but keep a hard read-only boundary: no changes and do not edit anything."

Expected behavior:
- load `zoom-out` for the inspect, survey, and discover request
- preserve the read-only boundary with no changes and no file edits
- report observations and open questions instead of applying fixes

## Prompt 4

"Implement the checkout refactor now and change the adapter names while you are in there."

Expected behavior:
- treat this as a non-trigger for `zoom-out` because the user asked to implement and change code
- do not load `zoom-out` unless the user adds an explicit read-only orientation request
- stay with current skill routing for implementation, refactor, prototype, or architecture-decision work
