# Explicit TDD Requests

## Prompt 1

"Use the tdd skill and prove the bug with a failing test before you change production code."

Expected behavior:
- immediately load `tdd`
- write a failing test before any implementation change

## Prompt 2

"I want this fix done test-first, so start with the tdd workflow."

Expected behavior:
- interpret this as an explicit request for `tdd`
- preserve the failing-test-first sequence
