# TDD Trigger Prompts

Use these prompts to verify implementation requests trigger `tdd` before production edits.

## Prompt 1

"Fix the bug where duplicate todos can be added, and make it a regression test with a RED failure before the GREEN fix."

Expected behavior:
- load `tdd`
- create a failing test first for the bug/regression
- follow RED-GREEN-REFACTOR and verify GREEN after minimal code

## Prompt 2

"Add a command to export plan history as JSON, but don't overbuild options that the first failing test doesn't need."

Expected behavior:
- load `tdd`
- treat this as implementation
- follow RED-GREEN-REFACTOR with minimal code for one behavior

## Prompt 3

"Refactor the gate parser without changing behavior. I manually tested the happy path, so please reject that shortcut and add automated proof first."

Expected behavior:
- load `tdd`
- use behavior-preservation tests because this is still TDD work
- reject manual testing as sufficient proof

## Prompt 4

"I wrote code first for the duplicate-task fix before remembering TDD. Help me recover without keeping that code already written as reference."

Expected behavior:
- load `tdd`
- require delete/start over for code written before the failing test and start over with TDD
