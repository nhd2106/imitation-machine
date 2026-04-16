# Multi-Turn Workflow: TDD To Verify

## Turn 1

User: "Fix the issue where empty plan titles are accepted."

Expected behavior:
- load `tdd`
- start with a failing test

## Turn 2

User: "Great, continue until the fix is complete."

Expected behavior:
- continue RED-GREEN-REFACTOR

## Turn 3

User: "Can I ship this now?"

Expected behavior:
- load or apply `verify`
- run fresh verification before claiming readiness
