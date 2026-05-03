# ADR: Run final review and release at plan finalization

## Status

Accepted

## Context

The orchestrator previously ran `reviewer-final` and `release` inside each task workflow. That allowed a task to receive final production-readiness review and release handoff while sibling tasks in the same plan were still pending, running, or able to fail later. Final review is intended to represent the integrated delivery unit, not an individual task slice.

## Decision

Keep task orchestration scoped to task-level phases: planning personas, implementation, task-level spec and quality review, specialized evidence, and task verification. After task execution finishes, run delivery finalization only when every task in the plan is completed and no task has failed.

Delivery finalization consists of one fresh plan-level `verify all --ref <planId>`, one `reviewer-final`, and one configured or skipped `release` handoff. Scoped `--task` runs only trigger finalization when completing that task makes the whole plan complete.

## Alternatives considered

- Keep final review and release per task. This preserves the old implementation but lets final approval happen before the full integrated diff exists.
- Run finalization after selected tasks only. This works for partial execution but misrepresents incomplete plans as release-ready.
- Add a new plan-level command schema immediately. This would make command ownership explicit, but is larger than needed for the orchestration semantics fix.

## Consequences

- Final review and release now run once per delivery unit instead of once per task.
- A missing `reviewer-final` command blocks release when finalization is due; final review remains non-skippable.
- QA remains skippable when no QA command is configured, and release remains skippable when no release command is configured.
- Existing task-level command configuration remains the source for finalization commands until a dedicated plan-level configuration is introduced.
