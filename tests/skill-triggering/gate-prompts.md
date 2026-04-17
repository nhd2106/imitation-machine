# Gate Trigger Prompts

## Prompt 1

"Before we call this ready, run the full gates and treat any failure as a blocker."

Expected behavior:
- load `gate`
- run the required quality gates instead of making a readiness guess

## Prompt 2

"I need coverage, typecheck, and policy blockers checked before this can proceed."

Expected behavior:
- load `gate`
- report blockers with gate evidence
