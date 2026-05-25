# Zoom-Out vs. Architecture-Deepening

Both are read-only discovery skills. They differ in the *grain* and *purpose* of the look.

- `zoom-out` — broad orientation. What does this area do, what surrounds it, what is the workflow shape? Read-only. Output is a survey, not a refactor recommendation.
- `architecture-deepening` — candidate discovery for refactor. Where are the shallow/deep modules, the seams, the behavior-protecting tests, the risks/tradeoffs? Read-only, but the deliverable feeds a future plan or ADR.

## Ambiguous Prompt 1

"Before we touch this module, give me the lay of the land — boundaries, neighbors, what calls in."

Should pick: `zoom-out`
Should NOT pick: `architecture-deepening`

Why: the user is asking for orientation around a module, not for refactor candidates inside it. No mention of shallow vs. deep, seams, or behavior protection. Pure scoping.

## Ambiguous Prompt 2

"Walk the auth subsystem and identify which modules are shallow vs. deep, where the seams are, and what tests we'd need before any refactor."

Should pick: `architecture-deepening`
Should NOT pick: `zoom-out`

Why: explicit shallow/deep terminology, seam identification, behavior-protecting tests — these are exactly the architecture-deepening deliverable. The user is preparing for refactor planning.

## Ambiguous Prompt 3

"Take a look around the billing area, see what's in there, and tell me if anything looks risky to change."

Should pick: `zoom-out` first, then `architecture-deepening` if approved
Should NOT pick: `architecture-deepening` alone

Why: this is two requests in one. The "take a look around" is `zoom-out` scope. The "what looks risky to change" hints at architecture-deepening, but you do not know yet whether the user wants a refactor candidate list or just risk flags. Start with `zoom-out`, then propose `architecture-deepening` as a follow-up if the user agrees.

## Ambiguous Prompt 4

"What are the seams in this codebase?"

Should pick: `architecture-deepening`
Should NOT pick: `zoom-out`

Why: "seams" is architecture-deepening vocabulary. The user is asking for refactor-candidate signal, not for a survey of the project layout.

## Counter-example (non-trigger for both)

"Refactor the auth module to extract the token service."

Neither skill applies. The user has already decided on the refactor and is asking for implementation. Route to `plan` (with `tdd` follow-up) or `subagent-driven-development`. Both `zoom-out` and `architecture-deepening` are read-only and explicitly do not authorize refactors.
