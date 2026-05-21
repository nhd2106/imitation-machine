# Architecture Deepening Checklist

Use this checklist during read-only candidate discovery.

## Evidence

- [ ] Scope inspected is named with paths, symbols, tests, or docs.
- [ ] Each candidate links to concrete evidence, not intuition alone.
- [ ] Unknowns and confidence are explicit.

## Candidate Shape

- [ ] Shallow module candidates identify cohesive grouping that still lacks a strong hiding boundary.
- [ ] Deep module candidates explain what complexity could be hidden behind a smaller interface.
- [ ] Seams are described as existing call boundaries, interfaces, tests, data boundaries, or adapter edges.
- [ ] Dependency categories separate domain logic, infrastructure, UI/API, persistence, configuration, and external services when relevant.

## Protection And Handoff

- [ ] Behavior-protecting tests are named before any production change.
- [ ] Risks/tradeoffs include coupling, migration cost, public contracts, rollout risk, and test gaps.
- [ ] Recommended handoff is explicit: `adr`, `plan`, `tdd`, `repo`, `prototype`, or more read-only discovery.
- [ ] The report stays read-only: no edits, no refactors, no implementation, no tracker publishing.
