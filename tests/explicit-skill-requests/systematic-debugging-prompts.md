# Explicit Systematic Debugging Requests

## Prompt 1

"Use `systematic-debugging` explicitly for this flaky regression. Reproduce it first, keep a hypothesis log, and do not jump to fixes before the evidence narrows the cause."

Expected behavior:
- load `systematic-debugging`
- honor the explicit `systematic-debugging` request before proposing fixes
- require reproduction, a hypothesis log, and evidence-based narrowing

## Prompt 2

"Please use `systematic-debugging` explicitly. I want a reproducible debugging plan with logged hypotheses, the smallest failing case, and instrumentation as evidence before implementation."

Expected behavior:
- interpret this as an explicit `systematic-debugging` request
- keep the workflow centered on reproduction and hypothesis tracking
- minimize the case before proposing a fix
- use instrumentation only as evidence for the hypothesis
- refuse to jump straight to fixes until the evidence supports a likely cause

## Prompt 3

"Use `systematic-debugging` explicitly and stop changing everything together. Change one variable at a time and pick a check that can confirm or kill the hypothesis."

Expected behavior:
- load `systematic-debugging`
- change one variable at a time
- prefer a focused check that can confirm or kill the hypothesis

## Prompt 4

"Use `systematic-debugging` explicitly because the team keeps proposing random patches. Make the evidence narrow the likely cause before any fix."

Expected behavior:
- load `systematic-debugging`
- block another round of random patches
- require evidence that narrows the likely cause before fix work starts
