---
name: systematic-debugging
description: Use when debugging a stubborn failure, unclear regression, or inconsistent behavior where guesses are multiplying faster than evidence
---

# Systematic Debugging

## Overview

Debug by shrinking uncertainty, not by stacking guesses. Keep the runtime agent focused on one observable hypothesis at a time.

## Workflow

1. Reproduce the failure and capture the exact symptom.
2. Write the current hypothesis in `hypothesis-log-template.md`.
3. Run the smallest check that can confirm or kill that hypothesis.
4. Update the log, then either continue or stop when root cause is proven.
5. Use `references/debugging-checklist.md` before claiming the issue is understood.

## Red Flags

- Changing code before reproducing the failure
- Testing multiple hypotheses at once
- Saying "probably" without a matching observation
- Letting a runtime agent keep exploring after the hypothesis was disproven

## Companion Files

- `references/debugging-checklist.md`
- `hypothesis-log-template.md`
