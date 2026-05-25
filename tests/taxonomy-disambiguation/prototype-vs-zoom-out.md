# Prototype vs. Zoom-Out

Both are pre-implementation skills. They differ in *whether anything gets built*.

- `zoom-out` — read-only orientation. No files written. No artifacts produced. Output is a survey.
- `prototype` — approved disposable build. Throwaway artifact, explicitly not production, explicitly not a TDD shortcut. Hands learning to `plan` / `tdd` before any production work.

`prototype` requires explicit user approval. `zoom-out` does not — it is the default for read-only orientation.

## Ambiguous Prompt 1

"Give me a sense of how this onboarding flow should feel before we commit."

Should pick: `zoom-out` first (orient on existing flow), then ask whether the user wants a `prototype`.
Should NOT pick: `prototype` immediately.

Why: "before we commit" suggests pre-decision exploration. Start read-only. Only escalate to `prototype` after the user explicitly approves a disposable build.

## Ambiguous Prompt 2

"Throw together a quick interactive mockup of the two layout options so we can compare."

Should pick: `prototype` (after confirming approval and disposal boundary)
Should NOT pick: `zoom-out`

Why: "throw together" + "interactive mockup" + comparing two options = explicit prototype build request. But still ask one prototype question to confirm: what's the learning goal? What gets disposed at the end? How will we judge it?

## Ambiguous Prompt 3

"Explore whether the cache layer could absorb retries cleanly."

Should pick: `zoom-out` or `architecture-deepening` (read-only)
Should NOT pick: `prototype` (yet)

Why: "explore" is read-only. The user has not asked for a built artifact. If after exploration the user wants to test the idea with running code, *then* propose `prototype`.

## Ambiguous Prompt 4

"Build a prototype of the new dashboard."

Should pick: `prototype`
Should NOT pick: `zoom-out`

Why: explicit "build a prototype". But still apply the hard gate: ask one prototype question, confirm learning goal, confirm disposal boundary, confirm judgment criteria. A prototype request without those answers can drift into production-code overreach.

## Counter-example (non-trigger for both)

"Implement the new dashboard with React Server Components per the approved plan."

Neither applies. The user has an approved plan and is asking for production implementation. Route to `executing-plans` or `subagent-driven-development` with `tdd` inside.
