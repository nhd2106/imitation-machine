# Claude Code Manual Verification

Use this guide to separate the fast bounded harness from slower integration-oriented Claude Code verification.

## Fast bounded coverage

Lightweight automated coverage for the standard fast Claude harness lives in:

- `scripts/claude-code-harness.ts`
- `scripts/claude-live-harness.ts`
- `tests/claude-harness.test.ts`
- `tests/claude-harness-smoke.test.ts`
- `tests/claude-executable-harness.test.ts`
- `tests/claude-live-harness.test.ts`
- `tests/claude-code/run-tests.sh fast`

Run either:

```bash
bash tests/claude-code/run-tests.sh fast
```

or:

```bash
bun test tests/claude-harness.test.ts tests/claude-harness-smoke.test.ts tests/claude-executable-harness.test.ts tests/claude-live-harness.test.ts
```

The installed Claude lane is separate from this fast command set. Run it with `bash tests/claude-code/run-tests.sh installed`.

## Live bounded harness

The Claude live harness stays bounded and reuses the existing transcript semantics from `scripts/claude-code-harness.ts`.

- `tests/claude-code/live-scenarios.json` defines the checked-in live continuation scenarios
- `scripts/claude-live-harness.ts` loads that manifest, runs `claude --print`, and adds `--continue` on second-turn follow-ups
- `tests/claude-live-harness.test.ts` covers manifest loading, env gating, direct argv construction, continued-session sequencing, and transcript evaluation wiring

The checked-in Claude live manifest currently stays intentionally small and covers:

- `continuation-happy-path`
- `continuation-stale-verification`

These continuation fixtures preserve the transcript lines that matter for evaluation:

- the happy path proves a second turn can continue the same session and remain review-ready
- the stale-verification path proves carried-forward previous-run verification evidence is rejected in the continued transcript

By default, live mode skips cleanly unless `CLAUDE_LIVE=1` is set:

```bash
bash tests/claude-code/run-tests.sh live
```

To execute real Claude scenarios:

```bash
CLAUDE_LIVE=1 bash tests/claude-code/run-tests.sh live
```

## Installed Claude integration lane

This opt-in lane runs a bounded installed Claude continuation flow against a temp repo scaffolded from the reusable executable harness with the `docs-review` archetype.

- `tests/claude-code/installed-live-scenarios.json` defines the bounded installed continuation scenarios
- `scripts/claude-installed-live-harness.ts` scaffolds the temp repo, runs `claude --print` on the first turn, adds `--continue` on later turns, and validates ordered plan/execute/review/verify flow across the continued transcript
- `tests/claude-installed-live-harness.test.ts` covers manifest loading, env gating, argv construction, same-cwd docs-review scaffold reuse across three turns, continuation sequencing, and later-turn invalidation of stale or pre-write review/verify evidence

The checked-in installed continuation manifest currently covers:

- one 3-turn happy path: `claude --print`, then two `claude --print --continue` turns in the same scaffolded repo with fresh `review-spec`, `review-quality`, and `bun test` evidence after each later write
- stale verification surfaced after `--continue`
- missing rerun after a continued write, which invalidates prior review/verify evidence

By default this lane skips cleanly unless `CLAUDE_INSTALLED_LIVE=1` is set:

```bash
bash tests/claude-code/run-tests.sh installed
```

To execute the real installed lane:

```bash
CLAUDE_INSTALLED_LIVE=1 bash tests/claude-code/run-tests.sh installed
```

## Integration-oriented manual verification

Use the rest of this checklist to confirm Claude Code is seeing the current local `imitation-machine` plugin payload and the deeper orchestration guidance in a real session.

The fast harness does **not** try to prove the full documented Claude skill inventory. It only checks a bounded subset needed for the review-oriented flow:

- `using-agentic`
- `requesting-code-review`
- `review-spec`
- `review-quality`

Recovery-path coverage in the fast harness now also checks that Claude transcripts:

- include explicit install evidence before bounded skill visibility is trusted
- do not load a workflow skill that contradicts the routed workflow
- do not rely on stale verification evidence from a previous run
- do not report contradictory agent statuses
- preserve actionable transcript lines in failure messages for recovery debugging

The executable Claude lane adds a scaffolded temp repo that runs a bounded review flow end to end and asserts:

- expected repo files are produced
- transcript ordering stays bounded and deterministic
- `review-spec` completes before `review-quality`
- verify evidence is fresh from the current run

Use the manual checks below when you need confidence in the broader installed inventory and orchestration behavior. Treat the fast harness as a safety net for bounded transcript behavior, not as a substitute for real-session verification.

## Preconditions

1. Install the local plugin with the preferred local entrypoint:

```bash
./bin/agentic install local --surface claude
```

Raw script fallback if needed:

```bash
./scripts/install-local-claude-plugin.sh
```

2. Start a brand new Claude Code session.

## Basic checks

Ask Claude Code:

```text
Use Skill tool to list available skills.
```

Expected broader inventory examples:
- `using-agentic`
- `brainstorm`
- `plan`
- `tdd`
- `systematic-debugging`
- `dispatching-parallel-agents`
- `executing-plans`
- `finishing-a-development-branch`
- `requesting-code-review`
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
Before I open the PR, use the right workflow to get this ready for review and release.
```

Expected behavior:
- references `@release`
- branch-finish language can reference `finishing-a-development-branch`
- pre-PR review-request language can reference `requesting-code-review`
- review-response language can reference `receiving-code-review` once feedback exists
- requires fresh verification evidence

## Notes

- Claude Code may not expose OpenCode-style child sessions the same way
- the key thing to verify is that the installed skill content reflects the updated orchestration guidance

For the standard fast bounded harness suite across both surfaces, run:

```bash
bun run test:harness
```

`bun run test:harness` does not include the installed Claude lane. Run `bash tests/claude-code/run-tests.sh installed` separately when you want that opt-in installed integration coverage.
