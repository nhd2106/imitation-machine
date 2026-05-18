---
name: issue-slicing
description: Use when an approved requirements brief or approved plan needs read-only issue-slice drafting before planning or implementation commitment
---

# Issue Slicing

Draft vertical-slice issue drafts from an approved requirements brief or approved plan. This skill is read-only/chat-only: it produces discussion-ready issue drafts, not tracker updates or implementation plans.

## Hard Boundaries

- No file writes.
- No issue tracker writes or issue tracker integrations.
- Tracker publishing is out of scope; route any tracker publishing to a separate opt-in tracker workflow after explicit approval.
- No implementation, no code, and no code-task plan.
- Do not expand into triage, prototype, or broad handoff workflows.
- Preserve uncertainty; do not manufacture scope, estimates, owners, dependencies, or acceptance criteria that are not supported by the approved source.

## Inputs Required

Use only an approved requirements brief or approved plan. If the source is missing or not approved, stop and ask for approval or route back to `requirements-brief`, `grill-me`, or `@po`.

## Output Shape

For each vertical-slice issue draft, include:

- title and user-visible outcome
- source-backed scope and explicit out-of-scope notes
- acceptance notes or test notes from the source
- dependencies, including unresolved dependency questions
- HITL/AFK classification with a short reason
- uncertainty that remains open instead of invented detail

## Handoff Gate

Require approval before handoff to `plan`, `@po`, or an implementation workflow. If approval is not explicit, end with the proposed issue drafts and the exact approval question.

## Red Flags

Stop if you catch yourself:

- creating tracker issues or writing files
- publishing tracker items from this read-only drafting skill
- turning drafts into a code-task plan
- adding triage/prototype scope that was not requested
- hiding uncertainty to make the slices look complete
