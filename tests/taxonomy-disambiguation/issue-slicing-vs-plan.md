# Issue-Slicing vs. Plan

Both are decomposition skills. They differ in *granularity* and *output*.

- `issue-slicing` — vertical-slice issue drafts from an approved requirements brief. Produces a list of independent issues with dependencies, HITL/AFK classification, preserved uncertainty. No file writes. No tracker writes. Approval-gated handoff to `plan` or `@po`.
- `plan` — executable JSON plan (`PLN-xxx.json`) with task-level steps, file paths, verification commands, and approval (`agentic plan verify` + `agentic plan approve`). Granular enough that a fresh engineer can execute task by task.

`issue-slicing` is the layer between a requirements brief and a plan. It does not replace `plan`; it feeds it.

## Ambiguous Prompt 1

"Break the auth migration into smaller pieces of work."

Ambiguous — clarify before routing:

- if the user wants issue-tracker-shaped slices (epics → stories) → `issue-slicing`
- if the user wants executable engineering tasks (TSK-xxx with verification commands) → `plan`

Default to `issue-slicing` if no requirements brief has been written yet; default to `plan` if the brief and slices already exist.

## Ambiguous Prompt 2

"Turn the approved auth brief into a list of tickets we can prioritize."

Should pick: `issue-slicing`
Should NOT pick: `plan`

Why: "tickets" + "prioritize" = vertical issue drafts. The user wants the layer between brief and executable plan. Do not jump to `plan` until the slicing is approved.

## Ambiguous Prompt 3

"The slices are approved — give me the implementation plan."

Should pick: `plan`
Should NOT pick: `issue-slicing`

Why: explicit handoff from approved slices. `plan` is the next layer down — TSK-level decomposition with file paths and verification commands.

## Ambiguous Prompt 4

"Decompose this into engineering tasks I can dispatch to coders."

Should pick: `plan`
Should NOT pick: `issue-slicing`

Why: "engineering tasks" + "dispatch to coders" = TSK-level granularity. That's `plan`'s output, ready for `subagent-driven-development`.

## Counter-example (non-trigger for both)

"Just start on the password reset endpoint."

Neither applies. The user has skipped decomposition. If the scope is genuinely narrow (single endpoint, clear spec), route to `executing-plans` with `tdd`. If unclear, route back to `brainstorm` or `requirements-brief` first.
