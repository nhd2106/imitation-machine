# Explicit Dispatching-Parallel-Agents Requests

## Prompt 1

"Use `dispatching-parallel-agents` explicitly. I have independent checks that can run in parallel, but I still want one person to pull the results together and sort out any conflicts before the final answer."

Expected behavior:
- load `dispatching-parallel-agents`
- honor the explicit `dispatching-parallel-agents` request
- preserve parallel work plus one place to pull the results together

## Prompt 2

"Use `dispatching-parallel-agents` explicitly, but refuse any split that hits shared state. If two workers need the same file, keep that work together instead of pretending it is independent."

Expected behavior:
- interpret this as an explicit request for `dispatching-parallel-agents`
- allow safe parallel work only where independence is real
- refuse or regroup shared-state work instead of unsafe fanout

## Prompt 3

"Use `dispatching-parallel-agents` explicitly, then bring everything back through one person who resolves contradictions before we trust the final synthesis."

Expected behavior:
- load `dispatching-parallel-agents`
- require one place to reconcile results after the parallel work
- resolve contradiction risk before final reporting
