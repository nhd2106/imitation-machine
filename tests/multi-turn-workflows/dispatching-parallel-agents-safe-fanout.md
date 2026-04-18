# Multi-Turn Workflow: Dispatching-Parallel-Agents

## Turn 1

User: "Use `dispatching-parallel-agents`. I have three independent checks before we ship: one person can verify the changelog, one can verify screenshots, and one can verify the package contents. Write down why those can run in parallel before anyone starts."

Expected behavior:
- load `dispatching-parallel-agents`
- set up parallel work only after a safety check confirms the checks are independent
- keep one place to pull the results together for the final synthesis

## Turn 2

User: "One proposed split is wrong: two people both want the same file, so that shared state is not safe to split. Keep that work together, call out the contradiction, and only separate the truly independent slices."

Expected behavior:
- recognize the same-file shared state as not safe to split
- keep together or serialize the overlapping work instead of unsafe parallel work
- carry the contradiction forward into the final synthesis instead of ignoring it

## Turn 3

User: "Now finish it: bring the results back together in one place, resolve any contradictions before we answer, and attach verification evidence showing which checks ran in parallel versus stayed grouped."

Expected behavior:
- keep one place as the final merge point
- produce a single synthesis after the parallel checks finish
- resolve contradictions before final reporting
- preserve verification evidence about the parallel work and the grouped shared-state exception
