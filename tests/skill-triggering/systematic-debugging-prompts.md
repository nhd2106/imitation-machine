# Systematic Debugging Trigger Prompts

Use these prompts to verify flaky or unclear failures trigger systematic debugging instead of guess-and-check fixes.

## Prompt 1

"The bug only fails sometimes and we keep guessing. Make us reproduce it first before anyone suggests a fix."

Expected behavior:
- load `systematic-debugging` before proposing fixes
- insist on a reproducible debugging approach instead of jumping straight to fixes

## Prompt 2

"Help me debug this regression with a hypothesis log, a minimal repro, and evidence-based narrowing, not random fixes."

Expected behavior:
- load `systematic-debugging`
- treat the hypothesis log as the core debugging structure
- minimize the failing case before broad investigation
- narrow the search through evidence instead of ad hoc code changes

## Prompt 3

"Engineers want to patch three files immediately, but we still cannot explain the failure. Slow this down and debug systematically with reproduction steps, hypotheses, and evidence first."

Expected behavior:
- load `systematic-debugging`
- push for reproduction, logged hypotheses, and evidence-based narrowing
- avoid fix-first pressure until the likely cause is understood

## Prompt 4

"We added logs, changed config, and swapped dependencies all at once, so nobody knows what mattered. Debug this with instrumentation as evidence and one variable at a time."

Expected behavior:
- load `systematic-debugging`
- use instrumentation only to gather evidence for the active hypothesis
- change one variable at a time instead of bundling unrelated checks
