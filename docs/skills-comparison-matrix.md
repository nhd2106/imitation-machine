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
| `using-agentic` | `using-superpowers` | Comparable | Partial | Partial | fixture coverage exists now, but explicit-request and multi-turn depth are still lighter than the strongest workflow bootstrap suites | `tests/multi-turn-workflows/using-agentic-to-plan.md` |
| `brainstorm` | `brainstorming` | Comparable | Partial | Partial | trigger and explicit-request fixtures now exist, but the package still lacks richer design-pressure examples | `tests/multi-turn-workflows/brainstorm-to-plan.md` |
| `plan` | `writing-plans` | Partial | Partial | Partial | still thinner than the richest plan packages, but now has serial + grouped example artifacts | `skills/plan/examples/example-parallel-plan.json` |
| `executing-plans` | `executing-plans` | Comparable | Partial | Low | initial trigger coverage exists, but direct-execution examples and pressure scenarios are still thin | `tests/skill-triggering/executing-plans-prompts.md` |
| `verify` | `verification-before-completion` | Partial | Partial | Partial | still needs broader pressure-scenario coverage beyond completion and fix-proof prompts | `tests/skill-triggering/verify-prompts.md` |
| `subagent-driven-development` | `subagent-driven-development` | Comparable | Comparable | Partial | missing explicit multi-turn execution prompt tests | `tests/skill-triggering/subagent-driven-development-prompts.md` |
| `tdd` | `test-driven-development` | Comparable | Partial | Low | needs pressure-scenario evals, not just structure checks | `tests/skill-triggering/tdd-prompts.md` |
| `review-spec` | request/review system pieces | Partial | Partial | Low | trigger fixtures exist, but review reports and deeper compliance scenarios are still sparse | `tests/skill-triggering/review-spec-prompts.md` |
| `review-quality` | request/review system pieces | Partial | Partial | Low | trigger fixtures exist, but severity calibration and maintainability-pressure scenarios remain light | `tests/skill-triggering/review-quality-prompts.md` |
| `review-security` | no exact match; related security review patterns | Unique | Comparable | Low | needs stronger behavioral/eval scenarios for real findings | `tests/skill-triggering/review-security-prompts.md` |
| `design` | partially overlaps brainstorming + design guidance | Unique | Partial | Low | still lacks a dedicated visual/design evaluation suite and remains relatively reference-heavy | `skills/design/SKILL.md` |
| `systematic-debugging` | `systematic-debugging` | Comparable | Partial | Low | needs deeper debugging prompt fixtures and decision-pressure evals | `tests/skill-triggering/systematic-debugging-prompts.md` |
| `dispatching-parallel-agents` | `dispatching-parallel-agents` | Comparable | Partial | Low | needs explicit safe-parallelism prompt fixtures | `tests/skill-triggering/dispatching-parallel-agents-prompts.md` |
| `finishing-a-development-branch` | branch-finishing / release-adjacent flow | Partial | Partial | Low | needs branch-handoff prompt fixtures and final-cleanup examples | `tests/skill-triggering/finishing-a-development-branch-prompts.md` |
| `requesting-code-review` | `requesting-code-review` | Comparable | Partial | Low | needs more end-to-end PR review-request scenarios beyond the initial fixtures | `tests/skill-triggering/requesting-code-review-prompts.md` |
| `receiving-code-review` | `receiving-code-review` | Comparable | Partial | Low | needs reviewer-feedback response fixtures and defer-vs-fix evals | `tests/skill-triggering/receiving-code-review-prompts.md` |
| `gate` | no strong direct counterpart | Unique | Partial | Partial | still needs failure-heavy scenario depth, but blocker guidance is in place | `tests/skill-triggering/gate-prompts.md` |
| `pr` | no strong direct counterpart | Unique | Partial | Partial | now has lightweight trigger coverage; still thinner than full end-to-end PR evals | `tests/skill-triggering/pr-prompts.md` |
| `release` | finishing/release-adjacent flow | Partial | Partial | Partial | now has lightweight release-routing fixtures; still needs richer semver pressure cases | `tests/skill-triggering/release-prompts.md` |
| `worktree` | `using-git-worktrees` | Partial | Partial | Partial | stronger cleanup/removal-safety coverage landed; still lighter than the richest workspace fixture sets | `tests/explicit-skill-requests/worktree-prompts.md` |
| `repo` | no strong direct counterpart | Unique | Partial | Low | still lacks prompt-fixture coverage for affected-package and dependency-impact routing | `skills/repo/impact-checklist.md` |
| `adr` | no strong direct counterpart | Unique | Comparable | Low | still needs decision-quality examples and prompt-level routing coverage | `skills/adr/adr-template.md` |
| `commit` | no strong direct counterpart | Unique | Comparable | Low | still lacks behavioral evals around staging discipline and message drafting | `skills/commit/commit-message-template.md` |
| `writing-skills` | `writing-skills` | Comparable | Comparable | Partial | still lacks a repo-local harness tying skill-writing guidance to explicit eval runs | `skills/writing-skills/testing-skills-with-subagents.md` |

## Biggest Remaining Differences

### 1. Evaluation Maturity

`superpowers` still leads in:

- explicit skill-request tests
- trigger-based prompt suites
- multi-turn workflow evaluations
- more integration-style harnesses outside plain repo unit tests

### 2. Prompt Fixture Libraries

`imitation-machine` now has much stronger skill packages, but still lacks the dense prompt fixture inventory that makes `superpowers` easier to regression test at the behavior level.

### 3. A Few Thinner Skill Packages

These still lag behind the richest `superpowers` skills:

- `design`

`plan`, `verify`, `gate`, and `worktree` are no longer the thinnest workflow packages after the current fixture/examples wave, but they still benefit from more pressure-scenario coverage.

## Recommended Next Wave

1. Deepen pressure-scenario coverage for already-triggered skills such as `verify`, `gate`, `pr`, and `release`.
2. Add more realistic multi-turn fixtures where workflow stages hand off evidence across turns.
3. Expand `design`, `repo`, `adr`, and `commit` eval depth, which now stand out more clearly than the earlier thin-skill set.

## Bottom Line

`imitation-machine` is now much closer to `superpowers` in skill writing quality and package shape, including a shipped inline plan execution path.

The main remaining gap is not prose. It is behavioral evaluation depth.
