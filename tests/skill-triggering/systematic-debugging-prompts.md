# Systematic Debugging Trigger Prompts

Use these prompts to verify flaky or unclear failures trigger systematic debugging instead of guess-and-check fixes.

## Prompt 1

"The bug only fails sometimes and we keep guessing. What skill should be loaded first?"

Expected behavior:
- load systematic debugging before proposing fixes
- move from guessing to a reproducible debugging approach

## Prompt 2

"Help me debug this regression with a hypothesis log instead of random fixes."

Expected behavior:
- treat the hypothesis log as the core debugging structure
- debug through evidence and iteration rather than ad hoc code changes
