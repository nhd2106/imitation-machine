# Multi-Turn Workflow: Verify To Gate To PR

## Turn 1

User: "Before we open anything, run `verify` on this branch and do not rely on last night's green build. I need fresh `agentic verify all` evidence, not stale CI."

Expected behavior:
- load `verify`
- produce exact fresh verification evidence such as `agentic verify all`, coverage 81.4%, typecheck clean, and 112 tests passed before any review-ready claim

## Turn 2

User: "Verification passed with coverage 81.4%, typecheck clean, and 112 tests passed. Now move into `gate`: coverage dropped to 79.8% on the narrowed diff and the security scan is blocking on CVE-2026-4101."

Expected behavior:
- hand off from `verify` to `gate`
- carry the exact verification result into the gate decision instead of re-stating only stage names
- treat the coverage 79.8% regression and the blocking security scan finding `CVE-2026-4101` as blockers instead of waving them through

## Turn 3

User: "Everything is green now: coverage is back to 82.1% and the security scan is clean. Open a draft `pr` with what shipped together plus the verify and gate evidence."

Expected behavior:
- hand off from `gate` to `pr`
- carry forward the exact verification and gate evidence, including coverage 82.1% and security scan clean
- create a draft pr only after fresh verification and gate evidence are available, with a what shipped together summary
