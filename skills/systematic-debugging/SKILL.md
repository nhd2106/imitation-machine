---
name: systematic-debugging
description: Use when debugging a stubborn failure, unclear regression, or inconsistent behavior where guesses are multiplying faster than evidence
---

# Systematic Debugging

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues. Debug by shrinking uncertainty, not by stacking guesses.

**Core principle:** ALWAYS find the root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```text
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you have not completed Phase 1, you cannot propose fixes.

## When To Use

Use for any technical issue:

- test failures
- bugs in production or staging
- unexpected behavior
- performance problems
- build failures
- integration issues
- inconsistent behavior across environments

**Use this especially when:**

- under time pressure (emergencies make guessing tempting)
- "just one quick fix" seems obvious
- multiple previous fixes did not work
- you do not fully understand the issue

**Do not skip when:**

- the issue seems simple — simple bugs have root causes too
- you are in a hurry — rushing guarantees rework
- a reviewer wants it fixed NOW — systematic is faster than thrashing

## Workflow

You MUST complete each of the four phases below before proceeding to the next. Keep the runtime agent focused on one observable hypothesis at a time, and capture each step in `hypothesis-log-template.md` so the chain of evidence is auditable.

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

Before attempting any fix:

1. **Read error messages carefully**
   - Do not skip past errors or warnings.
   - They often contain the exact solution.
   - Read stack traces completely.
   - Note line numbers, file paths, error codes.

2. **Reproduce consistently**
   - Can you trigger it reliably?
   - What are the exact steps?
   - Does it happen every time?
   - If not reproducible, gather more data instead of guessing.
   - Capture the symptom verbatim in `hypothesis-log-template.md`.

3. **Minimize the repro**
   - Reduce to the smallest input, command, prompt, or path that still fails.
   - A minimal repro forces clarity on which variables matter.

4. **Check recent changes**
   - What changed that could cause this? `git log`, `git diff`, recent commits.
   - New dependencies, config changes, infrastructure differences.
   - Environmental differences across machines or CI.

5. **Gather evidence in multi-component systems**

   When the system has multiple layers (CI → build → signing, API → service → database), instrument every boundary **before** proposing fixes:

   ```text
   For EACH component boundary:
     - Log what data enters the component
     - Log what data exits the component
     - Verify environment/config propagation
     - Check state at each layer

   Run once to gather evidence showing WHERE it breaks.
   THEN analyze evidence to identify the failing component.
   THEN investigate that specific component.
   ```

   Example (a code-signing pipeline):

   ```bash
   # Layer 1: Workflow
   echo "=== Secrets available in workflow: ==="
   echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

   # Layer 2: Build script
   echo "=== Env vars in build script: ==="
   env | grep IDENTITY || echo "IDENTITY not in environment"

   # Layer 3: Signing script
   echo "=== Keychain state: ==="
   security list-keychains
   security find-identity -v

   # Layer 4: Actual signing
   codesign --sign "$IDENTITY" --verbose=4 "$APP"
   ```

   This reveals which layer fails (secrets → workflow ✓, workflow → build ✗) instead of guessing which one to patch.

6. **Trace data flow when the error is deep in a call stack**
   - Where does the bad value originate?
   - What called this with the bad value?
   - Keep tracing up until you find the source.
   - Fix at source, not at symptom.

### Phase 2: Pattern Analysis

Find the pattern before fixing:

1. **Find working examples** — locate similar working code in the same codebase. What works that resembles what is broken?
2. **Compare against references** — if implementing a pattern, read the reference implementation completely. Do not skim. Read every line.
3. **Identify differences** — list every difference between working and broken, however small. Do not assume "that can't matter."
4. **Understand dependencies** — what other components does this need? What settings, config, environment? What assumptions does it make?

### Phase 3: Hypothesis And Testing

Use the scientific method:

1. **Form a single hypothesis**
   - State clearly in `hypothesis-log-template.md`: "I think X is the root cause because Y."
   - Be specific, not vague.

2. **Test minimally**
   - Make the smallest possible change that can confirm or kill the hypothesis.
   - One variable at a time.
   - Do not fix multiple things at once.

3. **Verify before continuing**
   - Did the evidence support the hypothesis? → Phase 4.
   - It did not? → form a new hypothesis. Do not stack more changes on top.

4. **When you do not know**
   - Say "I don't understand X" instead of pretending to know.
   - Ask for help.
   - Research more.

### Phase 4: Implementation

Fix the root cause, not the symptom:

1. **Create a failing test case**
   - Simplest possible reproduction.
   - Automated test if possible; one-off script if no framework exists.
   - MUST exist before fixing.
   - Use the `tdd` skill for proper RED-GREEN-REFACTOR discipline on the fix.

2. **Implement a single fix**
   - Address the root cause you identified.
   - One change at a time.
   - No "while I'm here" improvements.
   - No bundled refactoring.

3. **Verify the fix**
   - Test passes now?
   - No other tests broken?
   - The original symptom — rerun it — actually gone?

4. **If the fix does not work**
   - STOP.
   - Count: how many fixes have you tried?
   - If `< 3`: return to Phase 1, re-analyze with new information.
   - If `≥ 3`: STOP and question the architecture. Do not attempt Fix #4 without an architectural discussion.

5. **If 3+ fixes failed, question the architecture**

   Pattern that indicates an architectural problem:

   - each fix reveals a new shared-state or coupling issue in a different place
   - fixes require "massive refactoring" to implement
   - each fix creates new symptoms elsewhere

   Then stop and ask:

   - Is this pattern fundamentally sound?
   - Are we sticking with it through sheer inertia?
   - Should we refactor the architecture instead of patching symptoms?

   This is not a failed hypothesis — it is a wrong architecture. Discuss with the user before attempting more fixes. Open an `adr` if the decision changes a public contract.

## Audit Integration

If the failure originated in a subagent-driven task, use `agentic audit trace --id <req-id>` to inspect the dispatch and review history. Stale assumptions in earlier reviews often hide the actual cause.

## Red Flags — STOP And Return To Phase 1

| Thought | Reality |
|---------|---------|
| "Quick fix for now, investigate later" | First fix sets the pattern. Do it right from the start. |
| "Just try changing X and see if it works" | That is guess-and-check, not debugging. |
| "Add multiple changes, run tests" | You cannot isolate what worked. New bugs follow. |
| "Skip the test, I'll manually verify" | Untested fixes do not stick. |
| "It's probably X, let me fix that" | Seeing symptoms ≠ understanding root cause. |
| "I don't fully understand but this might work" | Stop. Form a hypothesis. |
| "One more fix attempt" (already tried 2+) | 3+ failures = architectural problem. Question the pattern, do not patch again. |
| "Each fix reveals a new problem in a different place" | The architecture is wrong, not the patch. |
| "Pattern says X but I'll adapt it differently" | Partial understanding guarantees bugs. Read the reference completely. |

## User Signals You Are Doing It Wrong

Watch for these and stop:

- "Is that not happening?" — you assumed without verifying.
- "Will it show us …?" — you should have gathered evidence.
- "Stop guessing" — you are proposing fixes without understanding.
- "Ultrathink this" — question fundamentals, not just symptoms.
- "We're stuck?" (frustrated) — your approach is not working.

When you see these signals: STOP. Return to Phase 1.

## Quick Reference

| Phase | Key activities | Success criteria |
|---|---|---|
| 1. Root cause | Read errors, reproduce, minimize, check changes, instrument boundaries, trace data flow | Understand WHAT and WHY |
| 2. Pattern | Find working examples, compare, list every difference | Identify the real difference |
| 3. Hypothesis | Form theory, test minimally, one variable at a time | Confirmed or new hypothesis |
| 4. Implementation | Failing test, single fix, regression proof | Bug resolved, tests pass, no new failures |

## When Investigation Reveals "No Root Cause"

If systematic investigation reveals the issue is truly environmental, timing-dependent, or external:

1. you have completed the process
2. document what you investigated and ruled out
3. implement appropriate handling (retry, timeout, error message, condition-based wait)
4. add monitoring/logging for future investigation

**Caveat:** most "no root cause" verdicts are incomplete investigation. Re-check.

## Companion Files

- `hypothesis-log-template.md` — capture symptom, current hypothesis, evidence, and outcome per iteration
- `references/debugging-checklist.md` — readiness check before claiming the issue is understood

## Real-World Impact

From debugging sessions where the discipline was followed:

- systematic approach: ~15-30 minutes to fix
- random-fix thrashing: 2-3 hours
- first-time fix rate: ~95% vs ~40%
- new bugs introduced: near zero vs common
