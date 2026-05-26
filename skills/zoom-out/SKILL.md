---
name: zoom-out
description: Use when read-only orientation is needed in unfamiliar code before planning, changing, refactoring, or debugging it
---

# Zoom Out

Build an evidence-backed discovery map of unfamiliar code so the next step starts from observed facts. This is read-only orientation before changes, not planning or implementation.

## When To Use

- A user asks to zoom out, orient, map, understand, survey, or explain an unfamiliar area of the repo.
- You need repo-grounded context before choosing whether to use `requirements-brief`, `issue-slicing`, `plan`, `adr`, `architecture-deepening`, `prototype`, or `systematic-debugging`.
- Read-only discovery is explicitly requested before a possible implementation, refactor, prototype, or architecture decision.

Do not load for direct implementation, refactor, prototype, or architecture decision requests unless the user explicitly asks for read-only orientation first.

## Hard Boundaries

- Read-only only: no file writes, no issue tracker writes, no implementation.
- No code-task planning, task breakdowns, estimates, or execution plans.
- No automatic handoff without approval; recommend the next handoff and ask before switching modes.
- Do not invent relationships, ownership, flows, or dependencies that are not supported by evidence.

## Workflow

0. **Read `CODEMAP.md` first if it exists** — `ls CODEMAP.md 2>/dev/null && cat CODEMAP.md`. This replaces most of the exploration step; skip to step 2 for any gaps the map doesn't cover. If the map is stale, note it and offer to update it using the `codemap` skill after orientation.
1. Inspect only the minimum repo files, tests, scripts, docs, and references needed to orient the requested scope.
2. Track evidence/sources as paths, symbols, commands, or excerpts that support each claim.
3. Produce the discovery map with confidence labels and unknowns instead of closing gaps by assumption.
4. Recommend the next handoff without starting it.

## Output Contract

Produce a concise discovery map with these sections:

1. Scope inspected
2. Evidence/sources
3. Module/responsibility map
4. Caller/entrypoint map
5. Dependencies/integrations
6. Data/control flow
7. Constraints/invariants
8. Unknowns/confidence
9. Recommended next handoff

## Preserve Uncertainty

- Label confidence as high, medium, or low based on direct evidence.
- Put missing facts in unknowns instead of presenting guesses as findings.
- Say when a relationship was not found, not when it therefore cannot exist.

## Distinct From

| Skill | Use that instead when |
| --- | --- |
| `repo` | You need monorepo impact analysis, affected-package discovery, or scoped test/build operations. |
| `requirements-brief` | You need a PRD-like requirements brief before planning or issue slicing. |
| `issue-slicing` | An approved source needs vertical issue drafts. |
| `adr` / `architecture-deepening` | The work is deciding, deepening, or recording an architecture choice. |
| `prototype` | The user approved exploratory implementation. |
| `systematic-debugging` | A concrete failure or regression needs root-cause debugging. |

## Red Flags

Stop if you catch yourself:

- editing files, drafting patches, or writing code
- creating or updating tracker issues
- turning the map into a code-task plan
- handing off automatically because the next step seems obvious
- hiding low confidence to make the map look complete
