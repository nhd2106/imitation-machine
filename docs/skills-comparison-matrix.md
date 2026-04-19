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
| `using-agentic` | `using-superpowers` | Comparable | Partial | Partial | bounded OpenCode/Claude harness transcripts now ship alongside a multi-turn `using-agentic -> tdd -> verify` workflow, but explicit-request depth is still lighter than the strongest bootstrap suites | `tests/multi-turn-workflows/using-agentic-to-tdd-to-verify.md` |
| `brainstorm` | `brainstorming` | Comparable | Partial | Partial | trigger/explicit-request fixtures now ship, but the package still lacks richer design-pressure examples | `tests/multi-turn-workflows/brainstorm-to-plan.md` |
| `plan` | `writing-plans` | Partial | Partial | Partial | still thinner than the richest plan packages, but now includes serial + grouped example artifacts plus bounded multi-turn `repo -> plan -> subagent-driven-development` and scaffolded executable `plan -> subagent-driven-development -> review-spec -> review-quality -> verify` handoffs | `tests/multi-turn-workflows/plan-to-subagent-review-to-verify.md` |
| `executing-plans` | `executing-plans` | Comparable | Partial | Partial | adds trigger/explicit-request pressure coverage for approved-plan direct-lane pressure, carried verification evidence, and stop-if-the-lane-expands cases, plus a bounded multi-turn `plan -> executing-plans` handoff; broader direct-execution recovery cases are still thin | `tests/explicit-skill-requests/executing-plans-prompts.md` |
| `verify` | `verification-before-completion` | Partial | Partial | Partial | adds trigger/explicit-request pressure coverage for exact reproduction reruns, smoke-test refusal, and fresh-evidence-before-completion prompts, plus bounded multi-turn `verify -> gate -> pr`, `review-security -> systematic-debugging -> verify`, and scaffolded executable `plan -> subagent-driven-development -> review-spec -> review-quality -> verify` handoffs; broader end-to-end verification depth is still thin | `tests/explicit-skill-requests/verify-prompts.md` |
| `subagent-driven-development` | `subagent-driven-development` | Comparable | Comparable | Partial | now has a stricter multi-turn execution-and-review loop plus a scaffolded executable `plan -> subagent-driven-development -> review-spec -> review-quality -> verify` fixture that carries plan IDs, task IDs, review outcomes, and verification evidence; more task-variation coverage is still needed | `tests/multi-turn-workflows/plan-to-subagent-review-to-verify.md` |
| `tdd` | `test-driven-development` | Comparable | Partial | Partial | now has multi-turn workflow depth via `using-agentic -> tdd -> verify`, but pressure-scenario evals are still lighter than the best-covered skills | `tests/multi-turn-workflows/using-agentic-to-tdd-to-verify.md` |
| `review-spec` | request/review system pieces | Partial | Partial | Partial | now has multi-turn enforcement that `review-spec` must precede `review-quality`, plus a scaffolded executable `plan -> subagent-driven-development -> review-spec -> review-quality -> verify` fixture that preserves task IDs and explicit review outcomes across turns; review-report depth is still sparse | `tests/multi-turn-workflows/plan-to-subagent-review-to-verify.md` |
| `review-quality` | request/review system pieces | Partial | Partial | Partial | now has multi-turn coverage for quality review after spec approval, plus a scaffolded executable `plan -> subagent-driven-development -> review-spec -> review-quality -> verify` fixture that carries forward spec outcomes and verify readiness; severity calibration scenarios remain light | `tests/multi-turn-workflows/plan-to-subagent-review-to-verify.md` |
| `review-security` | no exact match; related security review patterns | Unique | Comparable | Partial | adds trigger/explicit-request pressure coverage for auth, untrusted input, secrets, severity, and blocking review-security cases, plus a bounded multi-turn `review-security -> systematic-debugging -> verify` handoff; broader security-review variation is still thin | `tests/explicit-skill-requests/review-security-prompts.md` |
| `design` | partially overlaps brainstorming + design guidance | Unique | Partial | Partial | stronger direction-lock guidance, companion docs, and a bounded multi-turn browser-validation workflow now ship; the remaining bounded gap is more pressure-scenario browser-validation coverage | `tests/skill-triggering/design-prompts.md` |
| `systematic-debugging` | `systematic-debugging` | Comparable | Partial | Partial | adds trigger/explicit-request pressure coverage for reproduce-first, hypothesis-log, evidence-based narrowing, and anti-fix-jumping prompts, plus a multi-turn fix handoff and bounded `review-security -> systematic-debugging -> verify` chain; broader debugging-to-verification chains are still thin | `tests/explicit-skill-requests/systematic-debugging-prompts.md` |
| `dispatching-parallel-agents` | `dispatching-parallel-agents` | Comparable | Partial | Partial | adds trigger/explicit-request pressure coverage for safe parallelism, shared-state refusal, central merge coordination, and contradiction resolution, plus a bounded multi-turn safe-parallel fanout workflow; broader real-world task variation is still thin | `tests/explicit-skill-requests/dispatching-parallel-agents-prompts.md` |
| `finishing-a-development-branch` | branch-finishing / release-adjacent flow | Partial | Partial | Partial | merged-branch cleanup is now covered as an explicit handoff path, and a bounded multi-turn `release -> finishing-a-development-branch` workflow now covers release evidence into safe cleanup sequencing, but broader branch-finish pressure cases are still thin | `tests/multi-turn-workflows/release-to-finishing-a-development-branch.md` |
| `requesting-code-review` | `requesting-code-review` | Comparable | Partial | Partial | now has multi-turn review-request to response depth, but more PR-state variation is still needed | `tests/multi-turn-workflows/requesting-to-receiving-code-review.md` |
| `receiving-code-review` | `receiving-code-review` | Comparable | Partial | Partial | now has multi-turn reviewer-feedback response coverage, but defer-vs-fix scenarios are still limited | `tests/multi-turn-workflows/requesting-to-receiving-code-review.md` |
| `gate` | no strong direct counterpart | Unique | Partial | Partial | adds trigger/explicit-request pressure coverage for failing coverage, typecheck, and security blockers plus refusal to wave them through, plus a bounded multi-turn `verify -> gate -> pr` workflow; broader gate recovery flows are still thin | `tests/explicit-skill-requests/gate-prompts.md` |
| `pr` | no strong direct counterpart | Unique | Partial | Partial | adds trigger/explicit-request pressure coverage for what-shipped-together summaries, failing-check draft PR handling, and ready-for-review transitions, plus a bounded multi-turn `verify -> gate -> pr` workflow; full end-to-end PR execution coverage is still lighter than the strongest suites | `tests/explicit-skill-requests/pr-prompts.md` |
| `release` | finishing/release-adjacent flow | Partial | Partial | Partial | adds trigger/explicit-request pressure coverage for semver choice, packaging/readiness blockers, and release-evidence handoffs, plus a bounded multi-turn `release -> finishing-a-development-branch` workflow; release execution depth is still thinner than the best workflow packages | `tests/explicit-skill-requests/release-prompts.md` |
| `worktree` | `using-git-worktrees` | Partial | Partial | Partial | merged-worktree cleanup now ships as a first-class end-to-end path with safe local deletion and optional remote deletion, but broader branch-shape pressure cases are still lighter than the richest sets | `tests/multi-turn-workflows/worktree-before-coder.md` |
| `repo` | no strong direct counterpart | Unique | Partial | Partial | adds trigger/explicit-request pressure coverage for base-branch uncertainty, affected packages, transitive dependency impact, and scoped-vs-full verification justification, plus bounded multi-turn `repo -> plan -> subagent-driven-development` and `repo -> scope -> verify` workflows; broader cross-workspace execution examples are still limited | `tests/explicit-skill-requests/repo-prompts.md` |
| `adr` | no strong direct counterpart | Unique | Comparable | Partial | adds trigger/explicit-request pressure coverage for team-is-in-a-hurry pressure, public contract shifts, and expensive-to-reverse decisions before coding, plus a bounded multi-turn `adr -> implementation boundary` workflow; richer ADR artifact examples and follow-through reviews are still sparse | `tests/explicit-skill-requests/adr-prompts.md` |
| `commit` | no strong direct counterpart | Unique | Comparable | Partial | adds trigger/explicit-request pressure coverage for verified conventional commits, hook-failure no-bypass behavior, and follow-up commit discipline, plus a bounded multi-turn `commit after hooks and verification` workflow; deeper staged-diff variation and post-hook flows are still lighter than the best workflow suites | `tests/explicit-skill-requests/commit-prompts.md` |
| `writing-skills` | `writing-skills` | Comparable | Comparable | Partial | now has stronger trigger and explicit-request coverage for create/fix/validate a skill package plus a bounded multi-turn `writing skill -> validate -> fix` workflow with carried evidence, but broader repo-local harness depth is still thin | `tests/explicit-skill-requests/writing-skills-prompts.md` |

## Biggest Remaining Differences

### 1. Evaluation Maturity

`superpowers` still leads mainly in:

- explicit skill-request tests
- trigger-based prompt suites
- multi-turn workflow evaluations
- more integration-style harnesses outside plain repo unit tests, though imitation-machine now has bounded OpenCode/Claude transcript harnesses and fast runner scripts

### 2. Prompt Fixture Libraries

`imitation-machine` now has much stronger skill packages, explicit-request suites, and multi-turn workflows, but still lacks the same overall fixture density that makes `superpowers` easier to regression test at the behavior level.

### 3. A Few Thinner Skill Packages

The thinnest remaining workflow packages are no longer concentrated only in `repo`, `adr`, and `commit` after the current fixture/examples wave.

`plan`, `verify`, and `worktree` are no longer the thinnest workflow packages after the current fixture/examples wave, and `design` is stronger on direction lock and browser-validation handoff depth. `verify`, `gate`, `pr`, `release`, `repo`, `adr`, `commit`, `review-security`, `systematic-debugging`, `executing-plans`, and `dispatching-parallel-agents` now also have bounded pressure-scenario trigger and explicit-request coverage; `verify`, `gate`, `pr`, `release`, `repo`, `adr`, `commit`, `plan`, `subagent-driven-development`, `review-spec`, `review-quality`, `executing-plans`, `dispatching-parallel-agents`, `finishing-a-development-branch`, `review-security`, and `systematic-debugging` also now have bounded multi-turn end-to-end workflow coverage, including a scaffolded executable `plan -> subagent-driven-development -> review-spec -> review-quality -> verify` chain, but all still benefit from more depth.

## Recommended Next Wave

1. Add denser recovery-path and failure-path workflow fixtures beyond the current bounded happy-path chains.
2. Expand integration-style verification beyond the existing fast harnesses with more realistic live-session checks where affordable.
3. Continue deepening the remaining thinner packages (`repo`, `adr`, `commit`, `executing-plans`, `dispatching-parallel-agents`, `review-security`, `systematic-debugging`) only where the extra end-to-end coverage adds distinct behavioral value.

## Bottom Line

`imitation-machine` is now very close to `superpowers` in workflow-skill coverage and ahead on workflow breadth, including a shipped inline plan execution path plus stronger release/review/governance surface area.

The main remaining gap is not prose or missing workflow skills. It is broader behavioral evaluation depth beyond the bounded OpenCode/Claude harness layer.
