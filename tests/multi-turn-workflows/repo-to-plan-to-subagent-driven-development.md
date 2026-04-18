# Multi-Turn Workflow: Repo To Plan To Subagent-Driven-Development

## Turn 1

User: "This monorepo change touches shared build logic. Start with `repo` against base branch `origin/main` and tell me the affected package set before anybody starts coding. Right now I know `packages/web` and `packages/build-utils` are probably involved."

Expected behavior:
- load `repo`
- identify the affected package set `packages/web` and `packages/build-utils`
- capture dependency impact from the `origin/main` comparison before execution starts

## Turn 2

User: "Good. Turn that repo analysis into a bounded `plan` with executable tasks instead of one vague implementation blob. Make it plan `PLN-742` with task IDs `TSK-201` for `packages/build-utils` and `TSK-202` for `packages/web`."

Expected behavior:
- hand off from `repo` to `plan`
- convert the affected-package analysis into plan `PLN-742`
- carry the exact repo findings into executable tasks `TSK-201` and `TSK-202` instead of losing the affected package context

## Turn 3

User: "The plan is approved. Execute `PLN-742` with `subagent-driven-development` task by task using fresh workers and review gates, starting with `TSK-201` and then `TSK-202`."

Expected behavior:
- hand off from `plan` to `subagent-driven-development`
- carry `PLN-742`, `TSK-201`, and `TSK-202` into execution rather than replacing them with generic stage names
- require task by task execution with fresh workers and review gates
