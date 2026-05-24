---
name: systematic-debugging
description: Use when debugging a stubborn failure, unclear regression, or inconsistent behavior where guesses are multiplying faster than evidence
---

# Systematic Debugging

## Overview

Debug by shrinking uncertainty, not by stacking guesses. Keep the runtime agent focused on one observable hypothesis at a time, starting with a feedback loop that proves the bug is present or absent.

## The Rule

The workflow is **feedback-loop-first**: do not hypothesize, patch, publish tracker updates, or hand off implementation until you have a deterministic pass/fail signal for the real symptom, or a stated plan to improve a flaky repro rate until it is debuggable.

## Workflow

1. Build or improve the feedback loop until it gives a deterministic pass/fail signal for the exact user symptom. If the failure is flaky, run repeated/stress loops and improve the flaky repro rate before continuing.
2. Reproduce the failure and capture the exact symptom.
3. Minimize the repro to the smallest input, command, prompt, or path that still fails.
4. Write 3-5 ranked falsifiable hypotheses in `hypothesis-log-template.md`; each hypothesis must include the prediction that would confirm or kill it.
5. Use prediction-based probes: instrument only enough to create evidence for the active prediction.
6. Change one variable at a time and run the smallest check that can confirm or kill a hypothesis.
7. Update the log, then repeat until root cause is proven.
8. Choose the regression seam that exercises the real bug pattern before any fix. If no valid seam exists, document that limitation instead of writing a false-confidence test.
9. Before claiming fixed, remove temporary instrumentation, provide regression proof, and perform original symptom verification by rerunning the initial feedback loop.
10. Use `references/debugging-checklist.md` before claiming the issue is understood.

## Boundaries

- This is not requirements intake, tracker triage, or tracker publishing. There is no tracker-publishing shortcut from debugging evidence to issue updates; publish only through a separate approved workflow.
- Do not use debugging as permission for broad refactors. If the regression seam exposes architectural debt, document it as follow-up after root cause and fix evidence.
- TDD still applies to the fix: write the failing regression test at the chosen seam before changing production code.

## Red Flags

- Changing code before reproducing the failure
- Proceeding without a feedback loop or accepting a weak/flaky signal without improving it
- Testing a hypothesis that has no prediction
- Testing multiple hypotheses at once
- Changing multiple variables in one check
- Adding broad instrumentation that does not answer the active hypothesis
- Leaving temporary instrumentation in the codebase after the fix
- Saying "probably" without a matching observation
- Claiming fixed without original symptom verification
- Treating a tracker update, requirements note, or broad refactor as the debugging outcome
- Letting a runtime agent keep exploring after the hypothesis was disproven

## Companion Files

- `references/debugging-checklist.md`
- `hypothesis-log-template.md`
