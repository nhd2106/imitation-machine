---
name: systematic-debugging
description: Use when debugging a stubborn failure, unclear regression, or inconsistent behavior where guesses are multiplying faster than evidence
---

# Systematic Debugging

## Overview

Debug by shrinking uncertainty, not by stacking guesses. Keep the runtime agent focused on one observable hypothesis at a time.

## Workflow

1. Reproduce the failure and capture the exact symptom.
2. Minimize the repro to the smallest input, command, prompt, or path that still fails.
3. Write the current hypothesis in `hypothesis-log-template.md`.
4. Instrument only enough to create evidence for that hypothesis.
5. Change one variable at a time and run the smallest check that can confirm or kill a hypothesis.
6. Update the log, then repeat until root cause is proven.
7. Before claiming fixed, provide regression proof by rerunning the original symptom and the targeted check.
8. Use `references/debugging-checklist.md` before claiming the issue is understood.

## Red Flags

- Changing code before reproducing the failure
- Testing multiple hypotheses at once
- Changing multiple variables in one check
- Adding broad instrumentation that does not answer the active hypothesis
- Saying "probably" without a matching observation
- Claiming fixed without original symptom verification
- Letting a runtime agent keep exploring after the hypothesis was disproven

## Companion Files

- `references/debugging-checklist.md`
- `hypothesis-log-template.md`
