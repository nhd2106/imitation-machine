# Requirements-Brief vs. Grill-Me

Both are intake/clarification skills. They differ in *who is doing the questioning* and *what comes out*.

- `requirements-brief` — synthesizes a PRD-style brief from the current context. Inspects repo, docs, prior messages. Output is a written brief with acceptance criteria, out-of-scope, and a handoff to `issue-slicing` / `plan` / `@po`. Avoids new interview rounds.
- `grill-me` — adversarial stress test of design assumptions, triggered by explicit user request ("grill me", "stress-test this", "challenge my assumptions"). Asks one question at a time with a recommended-answer hypothesis. No code, no plan. Output is a sharpened set of decisions, not a brief.

## Ambiguous Prompt 1

"Pull together what we know about the billing rewrite into a proper requirements doc."

Should pick: `requirements-brief`
Should NOT pick: `grill-me`

Why: "pull together what we know" + "proper requirements doc" = synthesize-from-current-context. The user is asking for a brief, not for adversarial questioning.

## Ambiguous Prompt 2

"Grill me on this auth migration before I commit to the plan."

Should pick: `grill-me`
Should NOT pick: `requirements-brief`

Why: explicit "grill me" trigger. The user wants challenge, not synthesis. Recommended-answer hypotheses + one-question-at-a-time, no code, no plan.

## Ambiguous Prompt 3

"What are we missing for the auth migration spec?"

Ambiguous. Default to `requirements-brief` if context is rich and the user wants synthesis; ask before routing to `grill-me` because the explicit grill trigger is missing.

The boundary: `grill-me` requires explicit invitation. Do not unilaterally grill the user.

## Ambiguous Prompt 4

"Stress-test this design — I want to find the holes before we commit."

Should pick: `grill-me`
Should NOT pick: `requirements-brief`

Why: "stress-test" is a `grill-me` trigger phrase. The user explicitly invited adversarial questioning.

## Counter-example (non-trigger for both)

"Can you remind me what we agreed on for the auth migration?"

Neither applies. Normal clarification. Answer directly from context. Do not load a skill for this.
