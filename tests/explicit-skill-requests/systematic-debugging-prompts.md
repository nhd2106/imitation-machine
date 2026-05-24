# Explicit Systematic Debugging Requests

## Prompt 1

"Use `systematic-debugging` explicitly for this flaky regression. Build a feedback loop with a pass/fail signal, improve the flaky repro rate, and do not jump to fixes before evidence narrows the cause."

Expected behavior:
- load `systematic-debugging`
- honor the explicit `systematic-debugging` request before proposing fixes
- require a reproducible feedback loop or pass/fail signal
- improve the flaky repro rate or reproduction rate until the symptom is debuggable
- require evidence-based narrowing before fix work starts

## Prompt 2

"Please use `systematic-debugging` explicitly. I want a reproducible debugging plan with logged hypotheses ranked by falsifiable prediction before implementation."

Expected behavior:
- interpret this as an explicit `systematic-debugging` request
- keep the workflow centered on reproduction and hypothesis tracking
- rank the logged hypotheses before testing them
- require each hypothesis to be falsifiable with a prediction
- refuse to jump straight to fixes until the evidence supports a likely cause

## Prompt 3

"Use `systematic-debugging` explicitly and stop changing everything together. Change one variable at a time, use a prediction-based probe, and pick a check that can confirm or kill the hypothesis."

Expected behavior:
- load `systematic-debugging`
- change one variable at a time
- make each instrumentation probe prediction-based instead of broad logging
- prefer a focused check that can confirm or kill the hypothesis

## Prompt 4

"Use `systematic-debugging` explicitly because the team keeps proposing random patches. Make the evidence narrow the likely cause before any fix."

Expected behavior:
- load `systematic-debugging`
- block another round of random patches
- require evidence that narrows the likely cause before fix work starts

## Prompt 5

"Use `systematic-debugging` explicitly before the fix. Minimize the failing case, choose the regression seam, and keep original symptom verification in the handoff."

Expected behavior:
- load `systematic-debugging`
- minimize to the smallest failing case
- choose the regression seam or test seam before implementation
- preserve original symptom verification in the fix handoff

## Prompt 6

"Use `systematic-debugging` explicitly even though the manager wants a tracker update. Keep tracker publishing out of this and require a separate approved workflow."

Expected behavior:
- load `systematic-debugging`
- enforce the tracker-publishing boundary with no tracker shortcut from debugging evidence
- require a separate approved workflow for tracker publishing

## Prompt 7

"Use `systematic-debugging` explicitly, then convert the debugging evidence into requirements intake and a PRD."

Expected behavior:
- load `systematic-debugging`
- honor the explicit `systematic-debugging` request as debugging work, not requirements intake
- do not treat systematic-debugging as requirements intake or PRD writing
- require separate approval before routing a requirements brief handoff

## Prompt 8

"Use `systematic-debugging` explicitly while you broadly refactor the failing area and nearby cleanup."

Expected behavior:
- load `systematic-debugging`
- do not use debugging as permission for broad refactors
- keep the debugging path anchored in root-cause evidence before code changes
- route the broad refactor cleanup as follow-up after the fix evidence is proven
