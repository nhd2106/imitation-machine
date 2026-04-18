# Explicit Gate Requests

## Prompt 1

"Use the `gate` skill explicitly. Coverage dipped last night, and I do not want anyone waving this through just because the demo is today. Check coverage, typecheck, and the security scan before you say we can proceed."

Expected behavior:
- load `gate`
- honor the explicit `gate` request before making a go-ahead call
- treat coverage, typecheck, and security scan failures as blockers

## Prompt 2

"Please use `gate` explicitly. If the security scan or typecheck is still red, stop the workflow and say we are blocked instead of trying to be helpful."

Expected behavior:
- interpret this as an explicit `gate` request
- run or require the named gates with blocker-oriented reasoning
- refuse to continue past failing typecheck or security scan results

## Prompt 3

"Use `gate` explicitly and be strict about it: if coverage is under the line, call that out even if the branch owner says we can clean it up later."

Expected behavior:
- load `gate`
- treat failing coverage as a workflow blocker
- refuse pressure to bypass the gate because of schedule pressure
