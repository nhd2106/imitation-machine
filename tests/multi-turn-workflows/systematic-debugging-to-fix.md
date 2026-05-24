# Multi-Turn Workflow: Systematic Debugging To Fix

## Turn 1

User: "This production-only failure is intermittent. Start with `systematic-debugging`, reproduce first, and build a feedback loop with a pass/fail signal so we can improve the flaky repro rate instead of patching guesses into the code."

Expected behavior:
- load `systematic-debugging`
- reproduce first before suggesting a fix
- build a feedback loop with a pass/fail signal for the original symptom
- improve the flaky repro rate until the intermittent failure is debuggable

## Turn 2

User: "Good. Keep a hypothesis log with ranked falsifiable hypotheses, then use a prediction-based probe and one variable at a time so we can explain the failure with evidence."

Expected behavior:
- maintain a hypothesis log
- rank falsifiable hypotheses before testing them
- use prediction-based probes tied to the active hypothesis
- change one variable at a time
- use evidence-based narrowing instead of guess-and-check changes

## Turn 3

User: "Now the repro points to one parsing branch. Pick the regression seam, require original symptom verification, clean up temporary instrumentation, and hand off from debugging to a bounded fix plan without losing the evidence trail."

Expected behavior:
- preserve the debugging evidence as a fix handoff
- choose the regression seam that exercises the real bug pattern
- require original symptom verification before claiming fixed
- require temporary instrumentation cleanup as part of the handoff
- move from `systematic-debugging` into a bounded implementation step only after the cause is narrowed

## Turn 4

User: "Use TDD for the fix now that root-cause evidence is captured, but do not treat this as a tracker update; there is no tracker-publishing shortcut."

Expected behavior:
- transition to `tdd` only after root-cause evidence is captured
- write a failing regression test at the chosen seam before production changes
- preserve the debugging evidence in the bounded fix plan
- keep tracker publishing out of scope unless a separate approved workflow exists
