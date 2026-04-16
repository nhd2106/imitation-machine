# Multi-Turn Workflow: Subagent Review Loop

## Turn 1

User: "Execute approved plan PLN-555 with separate implementer and reviewers for each task."

Expected behavior:
- load `subagent-driven-development`

## Turn 2

User: "Task 1 is done. Review it strictly against the task before quality."

Expected behavior:
- run Stage 1 spec review first

## Turn 3

User: "Spec passed. Continue the review loop."

Expected behavior:
- run quality review only after Stage 1 passes
- preserve the review order and task discipline
