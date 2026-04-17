# Claude Code Manual Verification

Use this checklist to confirm Claude Code is seeing the current local `imitation-machine` plugin payload and the deeper orchestration guidance.

## Preconditions

1. Install the local plugin:

```bash
./scripts/install-local-claude-plugin.sh
```

2. Start a brand new Claude Code session.

## Basic checks

Ask Claude Code:

```text
Use Skill tool to list available skills.
```

Expected:
- `using-agentic`
- `brainstorm`
- `plan`
- `tdd`
- `systematic-debugging`
- `dispatching-parallel-agents`
- `executing-plans`
- `finishing-a-development-branch`
- `receiving-code-review`
- `subagent-driven-development`
- `worktree`

## Opted-in orchestration checks

In a repo with `.imitation-machine-enabled`, ask:

```text
We have an approved design. Use the right workflow to plan and execute this safely.
```

Expected behavior:
- Claude should prefer the Imitation Machine workflow only because the repo opted in
- planning should route through `plan`
- approved-plan direct execution should be able to route through `executing-plans`
- debugging prompts should be able to route through `systematic-debugging`
- deeper orchestration should mention persona subagents
- non-trivial implementation should mention a worktree decision before coding

## Deep orchestration prompt

Ask:

```text
The requirement is approved. Use the right personas to decompose the work, decide workspace isolation, implement one task, then run spec and quality review in order.
```

Expected behavior:
- requirement/planning language references `@po` / `@planner`
- safe parallel check language can reference `dispatching-parallel-agents`
- architecture questions reference `@architect` when needed
- coding references `@coder`
- review order references `@reviewer-spec` then `@reviewer-quality`
- worktree decision appears before non-trivial coding

## Release-side verification prompt

Ask:

```text
Before I open the PR, use the right persona to verify release readiness.
```

Expected behavior:
- references `@release`
- branch-finish language can reference `finishing-a-development-branch`
- review-response language can reference `receiving-code-review`
- requires fresh verification evidence

## Notes

- Claude Code may not expose OpenCode-style child sessions the same way
- the key thing to verify is that the installed skill content reflects the updated orchestration guidance
