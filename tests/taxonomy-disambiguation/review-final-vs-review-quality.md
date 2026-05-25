# Review-Final vs. Review-Quality

Both are review skills. They sit at different stages of the staged review pipeline.

- `review-quality` — Stage 2 per-task review. After `review-spec` (Stage 1) passes, this checks the *implementation quality* of one task: readability, naming, control flow, duplication, hardcoded values, debug leftovers. Persisted with `agentic gate quality --ref <task-id>`.
- `review-final` — final holistic production-readiness review across the entire integrated diff. Runs *after* all per-task `review-spec` / `review-quality` reviews, after specialized `@security` / `@qa` / `@docs` checks, and after a fresh `agentic verify all`. Does **not** replace Stage 1 or Stage 2.

## Ambiguous Prompt 1

"Review the implementation of TSK-410 — make sure it's clean and not leaving anything sloppy."

Should pick: `review-quality`
Should NOT pick: `review-final`

Why: the request scopes to one task. Quality concerns for a single task belong to Stage 2. `review-final` operates over the integrated diff, not individual tasks.

## Ambiguous Prompt 2

"All tasks are done and the gates are green. Give me a final readiness check before I open the PR."

Should pick: `review-final`
Should NOT pick: `review-quality`

Why: all per-task reviews are already done. The user wants integrated-diff readiness, security/QA/docs risk awareness, and verification-evidence sanity. That's exactly `review-final`'s job.

## Ambiguous Prompt 3

"Review the diff."

Ambiguous. Clarify before routing:

- if it's a single task's diff with spec already verified → `review-quality`
- if it's the integrated branch diff before PR → `review-final`
- if spec compliance has not been checked yet → `review-spec` first

Do not route to `review-final` without confirming that per-task reviews are complete. `review-final` does not replace Stage 1/2.

## Ambiguous Prompt 4

"This PR has been verified — give it one last look before merge."

Should pick: `review-final`
Should NOT pick: `review-quality`

Why: "this PR" = integrated diff, "one last look" = holistic readiness, "before merge" = pre-release/PR position. All three signals point to `review-final`.

## Counter-example (non-trigger for both)

"Is the spec correctly implemented in TSK-410?"

This is Stage 1, not Stage 2 or final. Route to `review-spec`.
