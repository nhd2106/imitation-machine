# Explicit Systematic Debugging Requests

## Prompt 1

"Use `systematic-debugging` explicitly for this flaky regression. Reproduce it first, keep a hypothesis log, and do not jump to fixes before the evidence narrows the cause."

Expected behavior:
- load `systematic-debugging`
- honor the explicit `systematic-debugging` request before proposing fixes
- require reproduction, a hypothesis log, and evidence-based narrowing

## Prompt 2

"Please use `systematic-debugging` explicitly. I want a reproducible debugging plan with logged hypotheses and evidence, not another round of random patches."

Expected behavior:
- interpret this as an explicit `systematic-debugging` request
- keep the workflow centered on reproduction and hypothesis tracking
- refuse to jump straight to fixes until the evidence supports a likely cause
