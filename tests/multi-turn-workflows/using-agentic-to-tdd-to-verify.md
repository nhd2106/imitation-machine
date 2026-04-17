# Multi-Turn Workflow: Using Agentic To TDD To Verify

## Turn 1

User: "This repo opted into the workflow. Fix a regression where blank titles can still be saved."

Expected behavior:
- load `using-agentic` first because the repo explicitly opted into the workflow
- choose `tdd` as the implementation process skill instead of jumping straight into code

## Turn 2

User: "Proceed with the fix."

Expected behavior:
- write a failing test first
- continue the `tdd` loop with minimal implementation only after the failure is observed

## Turn 3

User: "Nice. Are we done now?"

Expected behavior:
- transition into `verify` before claiming completion
- run fresh verification evidence rather than relying on confidence or the focused test alone
