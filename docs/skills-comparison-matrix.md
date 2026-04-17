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
| `using-agentic` | `using-superpowers` | Comparable | Partial | Partial | fewer cross-platform references and no prompt-fixture evals | `tests/skill-triggering/using-agentic-prompts.md` |
| `brainstorm` | `brainstorming` | Comparable | Partial | Partial | no visual companion or prompt-fixture coverage | `tests/skill-triggering/brainstorm-prompts.md` |
| `plan` | `writing-plans` / `executing-plans` | Partial | Partial | Low | lacks deeper execution-handoff examples and prompt scenarios | `skills/plan/examples/example-plan.json` |
| `verify` | `verification-before-completion` | Partial | Partial | Low | needs explicit behavior evals under realistic prompts | `tests/explicit-skill-requests/verify-prompts.md` |
| `subagent-driven-development` | `subagent-driven-development` | Comparable | Comparable | Partial | missing explicit multi-turn execution prompt tests | `tests/skill-triggering/subagent-driven-development-prompts.md` |
| `tdd` | `test-driven-development` | Comparable | Partial | Low | needs pressure-scenario evals, not just structure checks | `tests/skill-triggering/tdd-prompts.md` |
| `review-spec` | request/review system pieces | Partial | Partial | Low | no prompt-fixture tests for spec-review behavior | `tests/skill-triggering/review-spec-prompts.md` |
| `review-quality` | request/review system pieces | Partial | Partial | Low | no prompt-fixture tests for severity and scope discipline | `tests/skill-triggering/review-quality-prompts.md` |
| `review-security` | no exact match; related security review patterns | Unique | Comparable | Low | needs stronger behavioral/eval scenarios for real findings | `tests/skill-triggering/review-security-prompts.md` |
| `design` | partially overlaps brainstorming + design guidance | Unique | Partial | Low | no visual/design evaluation suite and reference duplication remains | `skills/design/references/common-failures.md` |
| `systematic-debugging` | `systematic-debugging` | Comparable | Partial | Low | needs deeper debugging prompt fixtures and decision-pressure evals | `tests/skill-triggering/systematic-debugging-prompts.md` |
| `dispatching-parallel-agents` | `dispatching-parallel-agents` | Comparable | Partial | Low | needs explicit safe-parallelism prompt fixtures | `tests/skill-triggering/dispatching-parallel-agents-prompts.md` |
| `finishing-a-development-branch` | branch-finishing / release-adjacent flow | Partial | Partial | Low | needs branch-handoff prompt fixtures and final-cleanup examples | `tests/skill-triggering/finishing-a-development-branch-prompts.md` |
| `receiving-code-review` | `receiving-code-review` | Comparable | Partial | Low | needs reviewer-feedback response fixtures and defer-vs-fix evals | `tests/skill-triggering/receiving-code-review-prompts.md` |
| `gate` | no strong direct counterpart | Unique | Partial | Low | needs more examples and gate-failure scenario fixtures | `tests/skill-triggering/gate-prompts.md` |
| `pr` | no strong direct counterpart | Unique | Partial | Low | lacks prompt-fixture PR-body and traceability evals | `tests/skill-triggering/pr-prompts.md` |
| `release` | finishing/release-adjacent flow | Partial | Partial | Low | lacks release decision fixtures and tagging/changelog prompt tests | `tests/skill-triggering/release-prompts.md` |
| `worktree` | `using-git-worktrees` | Partial | Partial | Low | needs stronger examples and removal-safety scenarios | `tests/skill-triggering/worktree-prompts.md` |
| `repo` | no strong direct counterpart | Unique | Partial | Low | no affected-graph prompt-fixture tests | `tests/skill-triggering/repo-prompts.md` |
| `adr` | no strong direct counterpart | Unique | Comparable | Low | needs decision-quality examples and ADR prompt scenarios | `tests/skill-triggering/adr-prompts.md` |
| `commit` | no strong direct counterpart | Unique | Comparable | Low | no commit-message / traceability prompt-fixture evals | `tests/skill-triggering/commit-prompts.md` |
| `writing-skills` | `writing-skills` | Comparable | Comparable | Partial | still lacks repo-local harness tying skill-writing to explicit eval runs | `tests/skill-triggering/writing-skills-prompts.md` |

## Superpowers-Only Areas

These still exist in `superpowers` without a true equivalent in `imitation-machine`, or remain intentionally deferred:

| Superpowers Skill | Why It Matters | Suggested Response |
|---|---|---|
| `executing-plans` | explicit inline plan execution path | later follow-up if imitation-machine needs a first-class non-subagent execution path |
| `requesting-code-review` | teaches how to ask for review well | lower priority because `review-spec` and `review-quality` already exist |

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

- `plan`
- `verify`
- `gate`
- `worktree`
- `design`

They are no longer weak, but they still need more examples, scenarios, and usage fixtures.

## Recommended Next Wave

1. Build `tests/skill-triggering/` prompt fixtures for the highest-impact skills.
2. Build `tests/explicit-skill-requests/` prompt fixtures for `using-agentic`, `brainstorm`, `plan`, `tdd`, and `verify`.
3. Add a small set of multi-turn workflow fixtures for:
   - `using-agentic -> brainstorm -> plan`
   - `using-agentic -> tdd -> verify`
   - `subagent-driven-development -> review-spec -> review-quality`
4. Add example artifacts for thinner skills like `plan`, `gate`, and `worktree`.

## Bottom Line

`imitation-machine` is now much closer to `superpowers` in skill writing quality and package shape.

The main remaining gap is not prose. It is behavioral evaluation depth.
