# Dispatching Parallel Agents Trigger Prompts

Use these prompts to verify safely parallelizable work triggers dispatching-parallel-agents guidance.

## Prompt 1

"I have three independent research checks for a release note: one person can confirm the changelog, one can confirm package sizes, and one can confirm screenshots. Can we do those in parallel and have one person pull the results together at the end?"

Expected behavior:
- treat this as a parallel dispatch decision
- confirm the checks are independent before splitting work
- bring the results back together in one place instead of letting workers merge their own outputs

## Prompt 2

"Split this bug triage across runtime agents if it is truly separate work, but refuse the split if two people would need to edit the same file or depend on the same shared state."

Expected behavior:
- require safe parallel boundaries before dispatching
- avoid overlapping file ownership across runtime agents

## Prompt 3

"Two proposed agents both want `src/shared/cache.ts`. If that file is shared state, do not split that part up; keep only the unrelated checks separate."

Expected behavior:
- recognize shared state as a refusal case for that slice
- keep together or serialize overlapping work instead of forcing an unsafe split

## Prompt 4

"Let the independent checks run in parallel, but bring everything back to one person before we answer, because I want conflicts resolved in one place instead of getting three separate summaries."

Expected behavior:
- allow safe parallel dispatch for independent checks
- require one place to resolve contradictions before the final synthesis
