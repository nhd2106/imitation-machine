# Multi-Turn Workflow: Systematic Debugging To Fix

## Turn 1

User: "This production-only failure is intermittent. Start with systematic debugging and reproduce first instead of patching guesses into the code."

Expected behavior:
- load `systematic-debugging`
- reproduce first before suggesting a fix

## Turn 2

User: "Good. Keep a hypothesis log and narrow it with evidence so we can explain the failure."

Expected behavior:
- maintain a hypothesis log
- use evidence-based narrowing instead of guess-and-check changes

## Turn 3

User: "Now the repro points to one parsing branch. Hand off from debugging to a bounded fix plan without losing the evidence trail."

Expected behavior:
- preserve the debugging evidence as a fix handoff
- move from `systematic-debugging` into a bounded implementation step only after the cause is narrowed
