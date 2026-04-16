# TDD Trigger Prompts

Use these prompts to verify implementation requests trigger `tdd` before production edits.

## Prompt 1

"Fix the bug where duplicate todos can be added."

Expected behavior:
- load `tdd`
- create or describe a failing test first

## Prompt 2

"Add a command to export plan history as JSON."

Expected behavior:
- treat this as implementation
- follow RED-GREEN-REFACTOR

## Prompt 3

"Refactor the gate parser without changing behavior."

Expected behavior:
- use `tdd` because behavior preservation still needs tests
