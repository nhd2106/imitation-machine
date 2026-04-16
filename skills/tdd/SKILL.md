---
name: tdd
description: Use when implementing a feature, fixing a bug, or refactoring behavior before writing production code so the change is driven by a failing test first
---

# Test-Driven Development

Write the test first. Watch it fail. Write minimal code to pass. If production code appears before the failing test, delete it and restart.

## Overview

If you did not watch the test fail, you do not know whether it proves the right thing.

## When To Use

Always for:

- new features
- bug fixes
- refactors that preserve or change behavior
- any production code path where correctness matters

Ask before skipping for:

- throwaway prototypes
- generated code
- pure configuration changes

## The Iron Law

```text
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over.

No exceptions:

- do not keep it as reference
- do not adapt it while writing the test
- do not claim tests-after is the same thing

## Workflow

```dot
digraph tdd_flow {
  "Task ready" [shape=doublecircle];
  "Write failing test" [shape=box];
  "Does it fail for the right reason?" [shape=diamond];
  "Fix the test" [shape=box];
  "Write minimal code" [shape=box];
  "Focused test passes?" [shape=diamond];
  "Fix implementation" [shape=box];
  "Run broader tests" [shape=box];
  "Refactor with tests green" [shape=box];
  "Next behavior" [shape=diamond];

  "Task ready" -> "Write failing test";
  "Write failing test" -> "Does it fail for the right reason?";
  "Does it fail for the right reason?" -> "Fix the test" [label="no"];
  "Fix the test" -> "Write failing test";
  "Does it fail for the right reason?" -> "Write minimal code" [label="yes"];
  "Write minimal code" -> "Focused test passes?";
  "Focused test passes?" -> "Fix implementation" [label="no"];
  "Fix implementation" -> "Focused test passes?";
  "Focused test passes?" -> "Run broader tests" [label="yes"];
  "Run broader tests" -> "Refactor with tests green";
  "Refactor with tests green" -> "Next behavior";
  "Next behavior" -> "Write failing test" [label="yes"];
}
```

## Good And Bad Tests

Good:

```ts
test("rejects empty plan titles", () => {
  expect(() => createPlan({ title: "" })).toThrow("title");
});
```

Bad:

```ts
test("plan works", () => {
  expect(createPlan).toBeDefined();
});
```

Prefer one clear behavior over vague coverage.

## Why The Order Matters

- tests written after code often pass immediately and prove nothing
- tests-first forces you to validate the behavior was actually missing
- manual testing is not repeatable proof

## Red Flags

Stop if you catch yourself thinking:

- "This is too small to test"
- "I already know the fix"
- "I will add tests after"
- "Deleting this code would waste time"
- "This one exception is fine"

Those are TDD rationalizations.

## Rules

- one behavior per test whenever practical
- prefer behavior assertions over implementation-detail assertions
- avoid mocks unless the boundary is external I/O
- if the test passes immediately, fix the test before proceeding

## Companion Files

- `testing-anti-patterns.md`
- `regression-checklist.md`

## Completion

TDD proves the change incrementally. Broader workflow verification still happens later:

```sh
agentic verify all
```
