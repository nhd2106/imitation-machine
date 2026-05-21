# Architecture Deepening Trigger Prompts

Use these prompts to verify read-only architecture-deepening candidate discovery without implementation, refactors, tracker publishing, or bypassing `plan` / `tdd`.

## Prompt 1

"Before we plan refactors, do architecture-deepening on this area and identify shallow/deep module candidates from evidence only."

Expected behavior:
- load `architecture-deepening` for read-only candidate discovery before any refactor planning
- identify shallow and deep module candidates with evidence, confidence, and unknowns
- do not edit files, implement changes, publish trackers, or start `plan` / `tdd`

## Prompt 2

"Map seams, dependency categories, and behavior-protecting tests for this messy service, but keep the work read-only and no edits."

Expected behavior:
- load `architecture-deepening` because the request asks for architecture candidate discovery
- report seams, dependency categories, and tests to protect behavior before any production change
- keep the pass read-only with no file writes, no refactors, and no tracker publishing

## Prompt 3

"Find the risks/tradeoffs and recommended handoff for candidate boundaries in this module; tell me whether the next step is `adr`, `plan`, or `tdd`."

Expected behavior:
- load `architecture-deepening` to evaluate candidate module boundaries and handoffs
- summarize risks/tradeoffs, evidence quality, and whether `adr`, `plan`, or `tdd` is the recommended handoff
- preserve uncertainty instead of authorizing implementation or a refactor

## Prompt 4

"Implement the dependency split now, refactor the service boundaries, and update production code as you go."

Expected behavior:
- treat this as a non-trigger and do not load `architecture-deepening` because it asks for implementation and code changes
- route implementation or refactor work through approved `plan` and `tdd` instead
- do not use candidate discovery language to authorize edits or bypass production safeguards

## Prompt 5

"Zoom out on this unfamiliar repo area and give me broad orientation before we choose any next workflow."

Expected behavior:
- treat this as a non-trigger and do not load `architecture-deepening` because broad orientation belongs to `zoom-out`
- route the read-only discovery/orientation request to `zoom-out` instead
- avoid turning general repo/context mapping into architecture-specific candidate discovery

## Prompt 6

"In this monorepo, identify affected packages, dependency impact, and the scoped checks needed for this package change."

Expected behavior:
- treat this as a non-trigger and do not load `architecture-deepening` because monorepo affected-package and dependency impact analysis belongs to `repo`
- route package impact, transitive dependency impact, and scoped verification questions to `repo`
- avoid replacing repo workflow analysis with architecture candidate discovery

## Prompt 7

"We need an ADR for this durable public contract decision because it will be expensive to reverse later."

Expected behavior:
- treat this as a non-trigger and do not load `architecture-deepening` because durable public contract decisions belong to `adr`
- route architecture decision recording, tradeoff selection, and fallback planning to `adr`
- avoid using candidate discovery when the team is already making or documenting the decision
