---
name: tdd
description: Use when implementing a feature, fixing a bug, or refactoring behavior before writing production code so the change is driven by a failing test first
---

# Test-Driven Development

Write the test first. Watch it fail. Write minimal code to pass. If production code appears before the failing test, delete it and restart.

## Overview

If you did not watch the test fail, you do not know whether it proves the right thing.

**Violating the letter of the rules is violating the spirit of the rules.** TDD is the evidence that the behavior was missing before your change, not a ceremony to explain away after coding.

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
- delete means delete: remove the code, stop looking at it, and re-implement from the failing test

## RED-GREEN-REFACTOR Workflow

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

### RED — Write Failing Test

Write one minimal automated test for the next observable behavior. Name the behavior, call the public interface, and assert the required result. For a bug fix, RED is the regression test that reproduces the bug before the fix.

**Requirements:**

- one behavior per test
- clear name that describes the behavior
- real code (no mocks unless the boundary is external I/O)

### Verify RED — Watch It Fail

**Mandatory. Never skip.** Run the focused test:

```sh
bun test path/to/test.test.ts
```

Confirm:

- the test **fails** (not errors)
- the failure message is the one you expected
- the failure is because the behavior is missing (not a typo, import error, or setup mistake)

| Outcome | Action |
|---|---|
| Test passes immediately | You are testing existing behavior. Fix the test. |
| Test errors on setup | Fix the error and rerun until it fails for the right reason. |
| Test fails for the right reason | Proceed to GREEN. |

### GREEN — Minimal Code

Write the simplest code that makes the failing test pass. Do not add options, generalized helpers, cleanup, or nearby improvements that the test did not require.

### Verify GREEN — Watch It Pass

**Mandatory.** Run the focused test:

```sh
bun test path/to/test.test.ts
```

Confirm:

- the test **passes**
- other tests still pass
- output is pristine (no errors, no warnings, no debug leftovers)

| Outcome | Action |
|---|---|
| Test fails | Fix the **code**, not the test. |
| Other tests fail | Fix them before continuing. |
| Output noisy | Remove debug code before moving on. |

### REFACTOR — Clean Up While Green

Only refactor after GREEN. Improve names, remove duplication, or simplify shape without adding behavior. Run the focused tests after each refactor step. If a refactor breaks tests, get back to GREEN before changing anything else.

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

## Example: Bug Fix Regression

Bug: duplicate task names are accepted.

**RED**

```ts
test("rejects duplicate task names", () => {
  const board = createBoard([{ name: "ship" }]);

  expect(() => board.addTask({ name: "ship" })).toThrow("duplicate task");
});
```

Focused failure to observe before coding:

```text
FAIL expected function to throw "duplicate task"
```

**GREEN**

```ts
addTask(task: Task) {
  if (this.tasks.some((existing) => existing.name === task.name)) {
    throw new Error("duplicate task");
  }
  this.tasks.push(task);
}
```

**REFACTOR**

Only after the regression test passes, extract a `hasTaskNamed` helper if it makes the code clearer. Do not add case-insensitive matching or cross-project uniqueness until a failing test requires it.

## Why Order Matters

**"I'll write tests after"** — Tests-after pass immediately and prove nothing. They test what you built, not what's required. Test-first forces you to see the failure, proving the test actually catches the bug.

**"I already manually tested"** — Manual testing is ad-hoc: no record, cannot re-run, easy to miss edge cases under pressure. Automated tests are systematic.

**"Deleting X hours is wasteful"** — Sunk cost. Keeping unverified code is technical debt. Delete and rewrite with TDD: same hours, high confidence.

**"Tests-after achieve the same goals"** — No. Tests-after answer "what does this do?" Tests-first answer "what should this do?" Tests-after are biased by your implementation. Tests-first force edge-case discovery before implementing. 30 minutes of tests-after ≠ TDD.

**"TDD is dogmatic"** — TDD is pragmatic: finds bugs before commit, prevents regressions, enables refactoring. "Pragmatic" shortcuts mean debugging in production, which is slower.

## Rationalization Prevention

| Excuse | Reality |
|---|---|
| "Too simple to test" | Simple code breaks. The test takes 30 seconds. |
| "I will test after" | Tests-after are biased by the implementation and may pass immediately. |
| "Tests-after achieve the same goals" | Tests-after = "what does this do?" Tests-first = "what should this do?" |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, cannot re-run. |
| "Deleting X hours is wasteful" | Sunk cost. Keeping unverified code is technical debt. Delete means delete. |
| "Need to explore first" | Fine — throw away the exploration, then start TDD. |
| "Test is hard = the test is wrong" | Hard to test usually = hard to use. Listen to the test. |
| "The spirit matters more than the ritual" | Violating the letter removes the evidence TDD exists to provide. |

## Red Flags

Stop if you catch yourself thinking:

- "This is too small to test"
- "I will add tests after"
- "The test passes immediately, but I can continue"
- "I can keep the implementation open while I write the test"

Those are TDD rationalizations.

## When Stuck

| Problem | Move |
|---|---|
| You do not know how to test it | Write the wished-for public API in the test first, then ask whether that interface is right. |
| The test setup is huge | The design may be too coupled; simplify the interface or inject the external boundary. |
| The failure is not about the missing behavior | Fix the test until RED fails for the right reason. |
| You already wrote the fix | Delete the production code, stop looking at it, and start over with TDD. |
| A manual test seems faster | Use it only to learn; still write the automated regression before changing production code. |

## Companion Files

- `testing-anti-patterns.md`
- `regression-checklist.md`

