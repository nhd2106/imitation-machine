---
name: verify
description: Use when about to claim work is complete, fixed, ready to commit, or ready for review so fresh evidence is gathered before any success claim
---

# Verification

Evidence comes before claims. If you have not run fresh verification for the claim you are making, you cannot honestly say the work passes.

## Overview

The rule is simple: identify the proof, run it now, read the output, then make the claim.

## Gate Function

Before claiming completion, correctness, readiness, or success:

1. IDENTIFY: Name the command or evidence that proves the exact claim.
2. RUN: Execute the full command fresh in the current workspace.
3. READ: Inspect output, exit code, failure counts, and warnings.
4. VERIFY: Decide whether the output actually supports the claim.
5. REPORT: State the result with evidence, or report the failure honestly.

Skipping any step is not verification.

## Iron Law

```text
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

## Required Command

```sh
agentic verify all
```

If `agentic` is unavailable:

```sh
bun "$AGENTIC_CLI_PATH" verify all
```

## What It Proves

`agentic verify all` runs:

1. `agentic gate all`
2. `bunx tsc --noEmit`
3. `bun test`

## Verification Loop

```dot
digraph verify_flow {
  "Need to report status" [shape=doublecircle];
  "What command proves the claim?" [shape=diamond];
  "Run full verification" [shape=box];
  "Read full output and exit status" [shape=box];
  "Does output support the claim?" [shape=diamond];
  "Report failure with evidence" [shape=box];
  "Report success with evidence" [shape=box];

  "Need to report status" -> "What command proves the claim?";
  "What command proves the claim?" -> "Run full verification";
  "Run full verification" -> "Read full output and exit status";
  "Read full output and exit status" -> "Does output support the claim?";
  "Does output support the claim?" -> "Report failure with evidence" [label="no"];
  "Does output support the claim?" -> "Report success with evidence" [label="yes"];
}
```

## Claim Matrix

| Claim | Requires | Not sufficient |
|---|---|---|
| Tests pass | fresh test output with 0 failures | old test run, "should pass" |
| Typecheck is clean | fresh typecheck output with 0 errors | linter pass, confidence |
| Ready for PR | fresh `agentic verify all` + review readiness | passing one gate |
| Bug is fixed | verification of the original symptom | code changed, assumed fixed |
| Work is complete | verification evidence matching the scope | implementation report alone |
| Agent completed | independent diff and verification evidence | Agent reports success |

## Regression Proof For Fixes

When the claim is "the bug is fixed," do one more thing before you say a fix is verified: rerun the exact command that exposed the bug, confirm the failure is gone for the same reason, then run the broader verification command for the surrounding scope.

If the original failure came from a targeted test, use that targeted test first. If it came from a reproduction script, reuse that script before falling back to general confidence language.

## Red Flags

Stop if you are about to say:

- "done"
- "looks good"
- "should pass now"
- "ready for PR"
- "tests are green"
- "probably fixed"

without a fresh verification run that proves it.

Agent reports success only starts verification. Check what changed, rerun the relevant command, and report the actual state. Do not trust delegated success reports without independent evidence.

## Rationalization Prevention

| Excuse | Reality |
|---|---|
| "Should work now" | Run the verification |
| "I'm confident" | Confidence is not evidence |
| "Just this once" | No exceptions |
| "A partial check is enough" | Partial proof does not justify broad claims |
| "I already ran it earlier" | Stale output does not prove current state |
| "The agent said it passed" | Agent reports success are not evidence until independently checked |

## Failure Policy

- do not commit after failed verification
- do not open a PR after failed verification
- do not weaken gates to get a passing result
- fix the cause, then rerun verification

## Reporting Guidance

Good:

- "`agentic verify all` passed: coverage 81.2%, typecheck clean, tests 86 pass"

Bad:

- "Everything should be fine now"
- "Tests passed earlier"
- "Only typecheck failed but the change is done"

## Companion Files

- `references/verification-checklist.md`
- `failure-triage.md`

## Runtime Agent

- In OpenCode, prefer `@release` when the verification outcome is being used to decide PR or release readiness.
