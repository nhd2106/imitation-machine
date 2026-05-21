# Explicit Architecture Deepening Requests

## Prompt 1

"Use `architecture-deepening` explicitly to find evidence-backed shallow and deep module candidates before we decide what to plan."

Expected behavior:
- load `architecture-deepening` because the request is explicit
- honor the explicit `architecture-deepening` request as read-only candidate discovery
- identify shallow and deep candidates without implementation, refactors, or task execution

## Prompt 2

"Please use `architecture-deepening` explicitly as a read-only no-edits pass: list seams, dependency categories, and tests to protect behavior."

Expected behavior:
- load `architecture-deepening` because the request is explicit
- keep the pass read-only with no edits while reporting seams, dependency categories, and behavior-protecting tests
- avoid tracker publishing, production changes, or bypassing `plan` / `tdd`

## Prompt 3

"Use `architecture-deepening` explicitly, but only to define the boundary: explain what it does not authorize and whether the handoff is `adr`, `plan`, or `tdd`."

Expected behavior:
- load `architecture-deepening` while preserving the explicit non-authorizing boundary
- state that it does not authorize implementation, refactors, tracker publishing, task execution, or production changes
- recommend `adr`, `plan`, or `tdd` as the next handoff instead of starting that work
