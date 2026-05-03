# Agentic Workflow Cheatsheet

## Default sequence

Canonical final sequence:

1. Load `using-agentic`
2. Load a process skill
3. Do discovery or implementation work
4. Complete implementation and task-level reviews (`review-spec`, `review-quality`)
5. Run specialized checks/updates as needed: `review-security` / `@security`, `@qa`, `@docs`
6. Run `agentic verify all` to gather fresh verification evidence
7. Run `review-final` via `@reviewer-final` for holistic readiness
8. `@release` / PR / handoff (PR/release handoff)

## Typical mappings

- idea -> `brainstorm`
- approved requirement -> `plan`
- approved plan, direct in-session execution -> `executing-plans`
- implementation -> `tdd`
- stubborn regression or unclear failure -> `systematic-debugging`
- multi-task execution -> `subagent-driven-development`
- safe parallel fanout -> `dispatching-parallel-agents`
- branch wrap-up -> `finishing-a-development-branch`
- asking others to review verified work -> `requesting-code-review`
- review feedback response -> `receiving-code-review`
- completion claim -> `verify`
- final holistic readiness after fresh verification -> `review-final`
- PR/release handoff -> `pr` or `release` / `@release`

## OpenCode Agent Map

- `@po` -> requirement clarification
- `@planner` -> executable task decomposition
- `@architect` -> ADR and architecture decisions
- `@coder` -> bounded implementation
- `@reviewer-spec` -> Stage 1 review
- `@reviewer-quality` -> Stage 2 review
- `@reviewer-final` -> final holistic readiness review
- `@security` -> security review
- `@qa` -> test strategy review
- `@docs` -> docs updates
- `@release` -> PR/release readiness

## Never skip

- process-skill selection
- review ordering
- fresh verification evidence
- final readiness review before PR/release handoff
