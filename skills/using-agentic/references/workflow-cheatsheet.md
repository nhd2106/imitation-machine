# Agentic Workflow Cheatsheet

## Default sequence

1. Load `using-agentic`
2. Load a process skill
3. Do discovery or implementation work
4. Load review/release skills when needed
5. Run `agentic verify all` before claiming completion

## Typical mappings

- idea -> `brainstorm`
- approved requirement -> `plan`
- approved plan, direct in-session execution -> `executing-plans`
- implementation -> `tdd`
- stubborn regression or unclear failure -> `systematic-debugging`
- multi-task execution -> `subagent-driven-development`
- safe parallel fanout -> `dispatching-parallel-agents`
- branch wrap-up -> `finishing-a-development-branch`
- review feedback response -> `receiving-code-review`
- completion claim -> `verify`

## OpenCode Agent Map

- `@po` -> requirement clarification
- `@planner` -> executable task decomposition
- `@architect` -> ADR and architecture decisions
- `@coder` -> bounded implementation
- `@reviewer-spec` -> Stage 1 review
- `@reviewer-quality` -> Stage 2 review
- `@security` -> security review
- `@qa` -> test strategy review
- `@docs` -> docs updates
- `@release` -> PR/release readiness

## Never skip

- process-skill selection
- review ordering
- fresh verification evidence
