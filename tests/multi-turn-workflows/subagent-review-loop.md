# Multi-Turn Workflow: Subagent Review Loop

## Turn 1

User: "Execute approved plan PLN-555 with separate implementer and reviewers for each task."

Expected behavior:
- load `subagent-driven-development`
- require the task-by-task review chain `subagent-driven-development -> review-spec -> review-quality`

## Turn 2

User: "Task 1 is done. Review it strictly against the task before quality."

Expected behavior:
- run `review-spec` first
- do not skip directly to `review-quality`

## Turn 3

User: "Spec passed. Continue the review loop."

Expected behavior:
- run `review-quality` only after `review-spec` passes
- preserve the review order and task discipline with no skipped stage
