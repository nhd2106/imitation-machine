# Review Final Trigger Prompts

## Prompt 1

"The task-level reviews passed. Before release/PR, do a final holistic production readiness pass over the integrated diff and verification evidence."

Expected behavior:
- load `review-final`
- check integrated diff and verification evidence after task-level reviews
- treat this as final holistic production readiness before release/PR

## Prompt 2

"After task-level quality review passed, use a final pass to replace any remaining review-spec or review-quality checks and call it ready."

Expected behavior:
- load `review-final`
- state that final review does not replace review-spec or review-quality gates
- stop if task-level review evidence is missing

## Prompt 3

"Before PR handoff, look across the combined change for security, QA, and documentation risk rather than just the last commit."

Expected behavior:
- load `review-final`
- inspect the integrated diff, not only the last commit
- call out security, QA, and documentation risks before release/PR
