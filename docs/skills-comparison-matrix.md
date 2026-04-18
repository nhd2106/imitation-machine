# Skills Comparison Matrix

Comparison between `imitation-machine` and `superpowers`, focused on skill coverage, package depth, evaluation maturity, and the next highest-value improvements.

## Legend

- `Comparable`: roughly similar package depth or workflow maturity
- `Partial`: imitation-machine has the area but still has notable gaps
- `Unique`: no strong direct counterpart in the other repo
- `Missing`: superpowers has it, imitation-machine does not

## Matrix

| Imitation Machine Skill | Superpowers Equivalent | Coverage Status | Package Depth | Eval Coverage | Main Remaining Gap | Recommended Next File |
|---|---|---|---|---|---|---|
| `using-agentic` | `using-superpowers` | Comparable | Partial | Partial | fixture coverage now includes bounded OpenCode/Claude harness transcripts plus a multi-turn `using-agentic -> tdd -> verify` workflow, but explicit-request depth is still lighter than the strongest bootstrap suites | `tests/multi-turn-workflows/using-agentic-to-tdd-to-verify.md` |
| `brainstorm` | `brainstorming` | Comparable | Partial | Partial | trigger and explicit-request fixtures now exist, but the package still lacks richer design-pressure examples | `tests/multi-turn-workflows/brainstorm-to-plan.md` |
| `plan` | `writing-plans` | Partial | Partial | Partial | still thinner than the richest plan packages, but now has serial + grouped example artifacts | `skills/plan/examples/example-parallel-plan.json` |
| `executing-plans` | `executing-plans` | Comparable | Partial | Low | initial trigger coverage exists, but direct-execution examples and pressure scenarios are still thin | `tests/skill-triggering/executing-plans-prompts.md` |
| `verify` | `verification-before-completion` | Partial | Partial | Partial | now has multi-turn completion-proof coverage through `using-agentic -> tdd -> verify`, but broader pressure scenarios beyond completion and fix-proof prompts are still thin | `tests/multi-turn-workflows/using-agentic-to-tdd-to-verify.md` |
| `subagent-driven-development` | `subagent-driven-development` | Comparable | Comparable | Partial | now has a stricter multi-turn execution-and-review loop, but more task-variation coverage is still needed | `tests/multi-turn-workflows/subagent-review-loop.md` |
| `tdd` | `test-driven-development` | Comparable | Partial | Partial | now has multi-turn workflow depth via `using-agentic -> tdd -> verify`, but pressure-scenario evals are still lighter than the best-covered skills | `tests/multi-turn-workflows/using-agentic-to-tdd-to-verify.md` |
| `review-spec` | request/review system pieces | Partial | Partial | Partial | now has multi-turn enforcement that `review-spec` must precede `review-quality`, but review-report depth is still sparse | `tests/multi-turn-workflows/subagent-review-loop.md` |
| `review-quality` | request/review system pieces | Partial | Partial | Partial | now has multi-turn coverage for quality review after spec approval, but severity calibration scenarios remain light | `tests/multi-turn-workflows/subagent-review-loop.md` |
| `review-security` | no exact match; related security review patterns | Unique | Comparable | Low | needs stronger behavioral/eval scenarios for real findings | `tests/skill-triggering/review-security-prompts.md` |
| `design` | partially overlaps brainstorming + design guidance | Unique | Partial | Partial | stronger direction-lock guidance, companion docs, and a bounded multi-turn browser-validation workflow now ship; the remaining bounded gap is more pressure-scenario browser-validation coverage | `tests/skill-triggering/design-prompts.md` |
| `systematic-debugging` | `systematic-debugging` | Comparable | Partial | Low | needs deeper debugging prompt fixtures and decision-pressure evals | `tests/skill-triggering/systematic-debugging-prompts.md` |
| `dispatching-parallel-agents` | `dispatching-parallel-agents` | Comparable | Partial | Low | needs explicit safe-parallelism prompt fixtures | `tests/skill-triggering/dispatching-parallel-agents-prompts.md` |
| `finishing-a-development-branch` | branch-finishing / release-adjacent flow | Partial | Partial | Partial | merged-branch cleanup is now covered as an explicit handoff path, but broader branch-finish pressure cases are still thin | `tests/skill-triggering/finishing-a-development-branch-prompts.md` |
| `requesting-code-review` | `requesting-code-review` | Comparable | Partial | Partial | now has multi-turn review-request to response depth, but more PR-state variation is still needed | `tests/multi-turn-workflows/requesting-to-receiving-code-review.md` |
| `receiving-code-review` | `receiving-code-review` | Comparable | Partial | Partial | now has multi-turn reviewer-feedback response coverage, but defer-vs-fix scenarios are still limited | `tests/multi-turn-workflows/requesting-to-receiving-code-review.md` |
| `gate` | no strong direct counterpart | Unique | Partial | Partial | still needs failure-heavy scenario depth, but blocker guidance is in place | `tests/skill-triggering/gate-prompts.md` |
| `pr` | no strong direct counterpart | Unique | Partial | Partial | now has lightweight trigger coverage; still thinner than full end-to-end PR evals | `tests/skill-triggering/pr-prompts.md` |
| `release` | finishing/release-adjacent flow | Partial | Partial | Partial | merged-branch cleanup is now a supported end-to-end release-adjacent path, but richer semver and packaging pressure cases are still needed | `tests/multi-turn-workflows/worktree-before-coder.md` |
| `worktree` | `using-git-worktrees` | Partial | Partial | Partial | merged-worktree cleanup now ships as a first-class end-to-end path with safe local deletion and optional remote deletion, but broader branch-shape pressure cases are still lighter than the richest sets | `tests/multi-turn-workflows/worktree-before-coder.md` |
| `repo` | no strong direct counterpart | Unique | Partial | Partial | now has prompt fixtures for affected-package and dependency-impact reasoning, but scoped verification pressure cases are still lighter than the best-covered workflow skills | `tests/skill-triggering/repo-prompts.md` |
| `adr` | no strong direct counterpart | Unique | Comparable | Partial | now has prompt fixtures for durable decision triggers, but richer ADR artifact examples and follow-through reviews are still sparse | `tests/skill-triggering/adr-prompts.md` |
| `commit` | no strong direct counterpart | Unique | Comparable | Partial | now has prompt fixtures for verified conventional commits, but hook-failure and follow-up commit scenarios still need more depth | `tests/skill-triggering/commit-prompts.md` |
| `writing-skills` | `writing-skills` | Comparable | Comparable | Partial | still lacks a repo-local harness tying skill-writing guidance to explicit eval runs | `skills/writing-skills/testing-skills-with-subagents.md` |

## Biggest Remaining Differences

### 1. Evaluation Maturity

`superpowers` still leads in:

- explicit skill-request tests
- trigger-based prompt suites
- multi-turn workflow evaluations
- more integration-style harnesses outside plain repo unit tests, though imitation-machine now has bounded OpenCode/Claude transcript harnesses

### 2. Prompt Fixture Libraries

`imitation-machine` now has much stronger skill packages, but still lacks the dense prompt fixture inventory that makes `superpowers` easier to regression test at the behavior level.

### 3. A Few Thinner Skill Packages

These still lag behind the richest `superpowers` skills:

- `repo`
- `adr`
- `commit`

`plan`, `verify`, `gate`, and `worktree` are no longer the thinnest workflow packages after the current fixture/examples wave, and `design` is stronger on direction lock and browser-validation handoff depth. `worktree` now also supports merged-branch cleanup end to end, but all still benefit from more pressure-scenario coverage.

## Recommended Next Wave

1. Deepen pressure-scenario coverage for already-triggered skills such as `verify`, `gate`, `pr`, and `release`.
2. Add more realistic multi-turn fixtures where workflow stages hand off evidence across turns.
3. Expand `design`, `repo`, `adr`, and `commit` eval depth with more pressure cases, especially post-implementation browser-validation checks for `design`.

## Bottom Line

`imitation-machine` is now much closer to `superpowers` in skill writing quality and package shape, including a shipped inline plan execution path.

The main remaining gap is not prose. It is broader behavioral evaluation depth beyond the new bounded OpenCode/Claude harness layer.
