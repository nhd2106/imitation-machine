# Gate Trigger Prompts

## Prompt 1

"Before we call this ready, run the full gates. If coverage dropped below the threshold, stop and say the branch is blocked."

Expected behavior:
- load `gate`
- run the required quality gates instead of making a readiness guess
- treat failing coverage as a stop-ship blocker

## Prompt 2

"I need typecheck and the security scan checked before this can proceed, and I do not want either failure brushed aside."

Expected behavior:
- load `gate`
- report blockers with gate evidence
- refuse to wave through failing typecheck or security results

## Prompt 3

"If someone asks you to keep going even though coverage missed, typecheck is red, or the security scan found a blocker, stop the workflow and explain why it cannot move forward yet."

Expected behavior:
- load `gate`
- treat coverage, typecheck, and security failures as workflow blockers
- refuse to approve or continue until the blockers are resolved
