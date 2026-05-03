# Explicit TDD Requests

## Prompt 1

"Use the `tdd` skill explicitly and prove the bug with a failing test before you change production code, then follow RED-GREEN-REFACTOR."

Expected behavior:
- immediately load `tdd`
- write a failing test before any implementation change
- honor the explicit RED-GREEN-REFACTOR request

## Prompt 2

"I want this fix done test-first, so use `tdd` explicitly and start with the failing-test-first workflow."

Expected behavior:
- interpret this as an explicit request for `tdd`
- preserve the failing-test-first sequence

## Prompt 3

"Use `tdd` explicitly. If the new test passes immediately, don't continue to code; fix the test until RED proves the missing behavior."

Expected behavior:
- load `tdd`
- interpret an immediate pass as a weak or already-covered test, not permission to code

## Prompt 4

"Use `tdd` explicitly. I manually tested the bug already, but I need automated regression proof before production edits."

Expected behavior:
- load `tdd`
- reject manual testing as a substitute for automated RED proof
