---
name: review-spec
description: Use when reviewing completed implementation work against a task specification so requested behavior, test coverage, and scope discipline are checked before quality review
---

# Spec Review

This is Stage 1 review. Its job is to answer one question: does the implementation match the task, no more and no less?

## When To Use

- after implementation is complete for a task
- before code quality review starts
- when you need to confirm spec coverage and reject scope creep

## Workflow

```dot
digraph spec_review_flow {
  "Task implementation ready" [shape=doublecircle];
  "Read the task spec" [shape=box];
  "Inspect code and tests" [shape=box];
  "Missing requested behavior?" [shape=diamond];
  "Fail with concrete gaps" [shape=box];
  "Extra unrequested behavior?" [shape=diamond];
  "Fail for scope creep" [shape=box];
  "Do tests prove the task?" [shape=diamond];
  "Fail with weak-test findings" [shape=box];
  "Approve Stage 1" [shape=box];

  "Task implementation ready" -> "Read the task spec";
  "Read the task spec" -> "Inspect code and tests";
  "Inspect code and tests" -> "Missing requested behavior?";
  "Missing requested behavior?" -> "Fail with concrete gaps" [label="yes"];
  "Missing requested behavior?" -> "Extra unrequested behavior?" [label="no"];
  "Extra unrequested behavior?" -> "Fail for scope creep" [label="yes"];
  "Extra unrequested behavior?" -> "Do tests prove the task?" [label="no"];
  "Do tests prove the task?" -> "Fail with weak-test findings" [label="no"];
  "Do tests prove the task?" -> "Approve Stage 1" [label="yes"];
}
```

## What To Check

- every requested behavior is implemented
- no requested behavior is missing or partial
- no extra behavior was added without approval
- tests verify the requested behavior, not internal details
- tests are strong enough to catch real regression of the task

## Review Rules

- this is read-only review
- do not suggest optional quality improvements here unless they affect spec compliance
- partial completion is still a failure
- passing tests do not override a mismatch with the task

## Red Flags

Stop and fail the review if you see:

- behavior not mentioned in the task
- tests coupled to private implementation details
- assertions so weak that the task could break while tests still pass
- a task only partially implemented but described as done

## Output

On success:

```sh
agentic gate spec --ref <task-id>
```

On failure, report:

- what is missing
- what is extra
- what test coverage is insufficient
- why each issue blocks Stage 2

## Companion Files

- `references/spec-review-checklist.md`
- `review-report-template.md`

## Runtime Agent

- In OpenCode, prefer `@reviewer-spec` for this review stage.
