# Dispatching Parallel Agents Trigger Prompts

Use these prompts to verify safely parallelizable work triggers dispatching-parallel-agents guidance.

## Prompt 1

"I have three independent research checks. Can we dispatch them in parallel safely?"

Expected behavior:
- treat this as a parallel dispatch decision
- confirm the checks are independent before splitting work

## Prompt 2

"Split this work across runtime agents without stepping on the same files."

Expected behavior:
- require safe parallel boundaries before dispatching
- avoid overlapping file ownership across runtime agents
