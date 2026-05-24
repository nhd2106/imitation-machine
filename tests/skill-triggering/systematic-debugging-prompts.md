# Systematic Debugging Trigger Prompts

Use these prompts to verify flaky or unclear failures trigger systematic debugging instead of guess-and-check fixes.

## Prompt 1

"The bug only fails sometimes and we keep guessing. Build a feedback loop with a pass/fail signal and improve the flaky repro rate before anyone suggests a fix."

Expected behavior:
- load `systematic-debugging` before proposing fixes
- insist on a feedback loop with a pass/fail signal before jumping straight to fixes
- improve the flaky repro rate or reproduction rate until the intermittent symptom is debuggable

## Prompt 2

"Help me debug this regression with a hypothesis log of ranked falsifiable hypotheses and predictions, not random fixes."

Expected behavior:
- load `systematic-debugging`
- treat the hypothesis log as the core debugging structure
- rank hypotheses before testing them
- require each hypothesis to be falsifiable with a prediction
- narrow the search through evidence instead of ad hoc code changes

## Prompt 3

"Engineers want to patch three files immediately, but we still cannot explain the failure. Slow this down, minimize the repro, pick the regression seam, and preserve original symptom verification."

Expected behavior:
- load `systematic-debugging`
- push for a minimal reproduction before broad investigation
- choose a regression seam or test seam that exercises the real bug pattern
- require original symptom verification before claiming fixed
- avoid fix-first pressure until the likely cause is understood

## Prompt 4

"We added logs, changed config, and swapped dependencies all at once, so nobody knows what mattered. Debug this with instrumentation as evidence and one variable at a time."

Expected behavior:
- load `systematic-debugging`
- use instrumentation only as a prediction-based probe for the active hypothesis
- change one variable at a time instead of bundling unrelated checks

## Prompt 5

"We added instrumentation but nobody tied it to a prediction, and the proposed random fixes are hiding the signal. Debug systematically by making each probe confirm or kill one hypothesis, with evidence captured before the next change."

Expected behavior:
- load `systematic-debugging`
- tie every instrumentation probe to a hypothesis prediction
- capture evidence before changing another variable

## Prompt 6

"The team wants to publish a tracker update saying the bug is solved, but we have not verified the original symptom. Treat tracker publishing as separate and finish debugging first."

Expected behavior:
- load `systematic-debugging`
- enforce no tracker-publishing shortcut or no tracker update from debugging evidence alone
- require original symptom verification before any solved claim
- route tracker publishing to a separate approved workflow

## Prompt 7

"We finally have debugging evidence, so turn it into a requirements intake doc and PRD for the product team."

Expected behavior:
- load `systematic-debugging`
- do not treat systematic-debugging as requirements intake or PRD writing
- keep the debugging evidence focused on root cause and verification boundaries
- route any requirements brief or intake handoff only through separate approval

## Prompt 8

"While debugging this regression, broadly refactor the module and clean up the surrounding architecture so the bug cannot come back."

Expected behavior:
- load `systematic-debugging`
- do not use debugging as permission for broad refactors
- keep the next step tied to root-cause evidence and the regression seam
- route broad refactor cleanup as follow-up after the debugging fix is proven
