---
name: architecture-deepening
description: Use when evidence-backed shallow/deep module candidates, seams, dependencies, and behavior-protection risks need read-only discovery before refactor planning
---

# Architecture Deepening

Architecture deepening is read-only candidate discovery for places where the code may benefit from clearer boundaries. It finds evidence-backed shallow module candidates, deep module candidates, seams, dependency categories, tests to protect behavior, risks/tradeoffs, and recommended handoffs without starting the change.

## When To Use

- A user asks to deepen architecture understanding before a refactor, split, extraction, or dependency cleanup.
- You need candidate boundaries, seams, and dependency categories before deciding whether `adr`, `plan`, or `tdd` should come next.
- The requested output is evidence and handoff guidance, not edits or implementation.

Use `zoom-out` first when the repo area is still unfamiliar and needs general orientation. Use `repo` for monorepo impact or affected-package analysis. Use `adr` when a durable decision is already being made or recorded.

## Hard Boundaries

- Read-only only: no file writes, no refactors, no implementation, no task execution, no production changes.
- No tracker publishing: tracker publishing is out of scope and requires a separate opt-in tracker workflow with explicit approval.
- Does not authorize implementation or bypass `plan` / `tdd`; production work still needs the normal approval and test-first path.
- Does not create architecture decisions; hand off to `adr` when a public contract, expensive-to-reverse tradeoff, or durable decision is needed.
- Do not manufacture certainty. Preserve unknowns and confidence levels.

## Workflow

1. Inspect the minimum code, tests, docs, and dependency references needed to evaluate the requested area.
2. Record evidence paths, symbols, callers, tests, and observed coupling for every candidate claim.
3. Classify candidates:
   - shallow module candidates: cohesive grouping is visible but seams, tests, or dependencies are still thin.
   - deep module candidates: a boundary could hide meaningful complexity behind a small interface.
4. Identify seams, dependency categories, behavior-protecting tests, risks/tradeoffs, and recommended handoffs.
5. Stop with the candidate report. Ask before switching to `adr`, `plan`, `tdd`, `repo`, or `prototype`.

## Output Contract

Use `candidate-report-template.md` or include the same sections in chat. Use `references/deepening-checklist.md` as the companion checklist while gathering evidence:

1. Scope and evidence inspected
2. Shallow module candidates
3. Deep module candidates
4. Seams and dependency categories
5. Tests to protect behavior
6. Risks/tradeoffs and unknowns
7. Recommended handoffs

## Distinct From

| Skill | Use that instead when |
| --- | --- |
| `zoom-out` | You need broad orientation or a repo/context map before architecture-specific candidate discovery. |
| `repo` | You need affected packages, transitive dependency impact, or scoped test/build operations. |
| `adr` | The team is choosing or recording a durable architecture decision. |
| `plan` / `tdd` | The implementation path is approved and production changes are ready to plan or test-drive. |
| `prototype` | The user approved disposable artifacts to test an idea. |

## Red Flags

Stop if you catch yourself:

- editing files or drafting patches
- turning candidates into an implementation plan
- treating shallow/deep labels as approval to refactor
- publishing tracker issues from the report
- skipping `plan` or `tdd` because the candidate seems obvious
