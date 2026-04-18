# Systematic Debugging Trigger Prompts

Use these prompts to verify flaky or unclear failures trigger systematic debugging instead of guess-and-check fixes.

## Prompt 1

"The bug only fails sometimes and we keep guessing. Make us reproduce it first before anyone suggests a fix."

Expected behavior:
- load `systematic-debugging` before proposing fixes
- insist on a reproducible debugging approach instead of jumping straight to fixes

## Prompt 2

"Help me debug this regression with a hypothesis log and evidence-based narrowing, not random fixes."

Expected behavior:
- treat the hypothesis log as the core debugging structure
- narrow the search through evidence instead of ad hoc code changes

## Prompt 3

"Engineers want to patch three files immediately, but we still cannot explain the failure. Slow this down and debug systematically with reproduction steps, hypotheses, and evidence first."

Expected behavior:
- load `systematic-debugging`
- push for reproduction, logged hypotheses, and evidence-based narrowing
- avoid fix-first pressure until the likely cause is understood
