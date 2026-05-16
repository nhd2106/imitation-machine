# Project Context Guidance

Guidance only: this reference adds no new runtime behavior, installer behavior, or mandatory file creation.

## Setup Dependency Types

- **hard setup dependency**: missing context that blocks safe workflow selection, planning, or implementation. Examples: a required `CONTEXT.md` does not exist for a repo that says it relies on one, an ADR referenced by the task is missing from `docs/adr`, or `.out-of-scope` contradicts the requested work.
- **soft setup dependency**: helpful context that improves precision but does not block progress. Examples: optional background notes in `CONTEXT.md`, historical decisions in `docs/adr`, or `.out-of-scope` entries that clarify boundaries without changing the requested task.

## How To Use Existing Context

When using the Imitation Machine workflow, inspect repo-local guidance before asking the user for answers that may already be documented:

- `CONTEXT.md` for product, project, or repository background.
- `docs/adr` for accepted architectural decisions and durable tradeoffs.
- `.out-of-scope` for explicit boundaries, postponed work, and non-goals.

Treat hard setup dependencies as blockers to clarify. Carry soft setup dependencies forward as assumptions or notes, and ask only when the missing detail would change the next skill, plan, or acceptance criteria.
