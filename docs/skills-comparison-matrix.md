# Skills Comparison Matrix

This matrix compares `imitation-machine` to `superpowers` skill-by-skill. It focuses on whether each workflow area is covered, how complete the package is, how much evaluation coverage exists, and which remaining gaps are still worth closing.

## How to Read This Matrix

- `Coverage Status`: whether `imitation-machine` has a close counterpart for the same workflow area, and how close the overall workflow support is to `superpowers`
- `Package Depth`: how complete the skill package is on its own: instructions, companion docs, examples, and operating guardrails
- `Eval Coverage`: how much behavioral coverage exists through trigger tests, explicit-skill-request tests, and multi-turn workflow fixtures

## Legend

- `Comparable`: roughly on par for that column
- `Partial`: present, but still materially thinner or less varied
- `Unique`: no strong direct counterpart in the other repo
- `Missing`: `superpowers` has it; `imitation-machine` does not

## Matrix

| Imitation Machine Skill | Superpowers Equivalent | Coverage Status | Package Depth | Eval Coverage | Coverage Notes / Remaining Gap | Recommended Next File |
|---|---|---|---|---|---|---|
| `using-agentic` | `using-superpowers` | Comparable | Partial | Partial | OpenCode/Claude harness transcripts ship alongside a multi-turn `using-agentic -> tdd -> verify` workflow; `imitation-machine` is still ahead on reproducible executable + installed/live harness evidence for those shared surfaces, while `superpowers` keeps a much larger install/distribution footprint plus more longer-running live-ecosystem examples | `tests/multi-turn-workflows/using-agentic-to-tdd-to-verify.md` |
| `brainstorm` | `brainstorming` | Comparable | Partial | Partial | trigger/explicit-request fixtures ship, but the package still lacks richer design-pressure examples | `tests/multi-turn-workflows/brainstorm-to-plan.md` |
| `grill-me` | `grill-me` | Comparable | Partial | Partial | adds trigger/explicit-request pressure coverage for explicit grill-me, stress-test, and challenge-my-assumptions requests; keeps one-question interviewing, recommended-answer hypotheses, no-code/no-plan boundaries, and normal clarification non-trigger routing visible, but broader multi-turn grill sessions are still thin | `tests/explicit-skill-requests/grill-me-prompts.md` |
| `requirements-brief` | no strong direct counterpart | Unique | Partial | Partial | read-only current-context requirements brief / requirements synthesis coverage now includes trigger and explicit-request fixtures for PRD-style briefs, blocked-ambiguity boundaries, out-of-scope capture, and approval-gated handoff to `issue-slicing`, `plan`, or `@po` without implementation | `tests/explicit-skill-requests/requirements-brief-prompts.md` |
| `issue-slicing` | no strong direct counterpart | Unique | Partial | Partial | read-only issue drafts coverage now includes trigger and explicit-request fixtures for vertical slicing, dependencies, HITL and AFK classification, preserved uncertainty, and approval-gated no-tracker/no-implementation handoff behavior | `tests/explicit-skill-requests/issue-slicing-prompts.md` |
| `zoom-out` | no strong direct counterpart | Unique | Partial | Partial | shipped read-only discovery/orientation before planning, implementation, or code changes; trigger and explicit-request coverage keep it to repo/context mapping with no file writes, no issue tracker writes, and no implementation | `tests/explicit-skill-requests/zoom-out-prompts.md` |
| `architecture-deepening` | `improve-codebase-architecture` inspiration, adapted as read-only discovery | Unique | Partial | Partial | shipped read-only candidate discovery for shallow/deep module candidates, seams, dependency categories, behavior-protecting tests, risks/tradeoffs, and recommended handoffs without file writes, tracker publishing, refactors, or implementation authority; coverage includes trigger fixture `tests/skill-triggering/architecture-deepening-prompts.md` and explicit-request fixture `tests/explicit-skill-requests/architecture-deepening-prompts.md` | `tests/explicit-skill-requests/architecture-deepening-prompts.md` |
| `prototype` | no strong direct counterpart | Unique | Partial | Partial | shipped approved disposable prototype workflow coverage for short-lived learning artifacts after discovery; prototypes are not production implementation, not a TDD shortcut, and hand learned constraints to `plan` / `tdd` before production work | `tests/explicit-skill-requests/prototype-prompts.md` |
| `plan` | `writing-plans` | Partial | Partial | Partial | still thinner than the richest plan packages, but includes serial + grouped example artifacts plus scoped multi-turn `repo -> plan -> subagent-driven-development` and scaffolded executable `plan -> subagent-driven-development -> review-spec -> review-quality -> verify` handoffs | `tests/multi-turn-workflows/plan-to-subagent-review-to-verify.md` |
| `executing-plans` | `executing-plans` | Comparable | Comparable | Partial | adds trigger/explicit-request pressure coverage for approved-plan direct-lane pressure, carried verification evidence, stop-if-the-lane-expands cases, and worktree isolation/main/master shortcuts, plus a scoped multi-turn `plan -> executing-plans` handoff; broader direct-execution failure/recovery cases are still thin | `tests/explicit-skill-requests/executing-plans-prompts.md` |
| `verify` | `verification-before-completion` | Partial | Partial | Partial | adds trigger/explicit-request pressure coverage for exact reproduction reruns, smoke-test refusal, and fresh-evidence-before-completion prompts, plus scoped multi-turn `verify -> gate -> pr`, `review-security -> systematic-debugging -> verify`, and scaffolded executable `plan -> subagent-driven-development -> review-spec -> review-quality -> verify` handoffs; broader end-to-end verification depth is still thin | `tests/explicit-skill-requests/verify-prompts.md` |
| `subagent-driven-development` | `subagent-driven-development` | Comparable | Comparable | Partial | has a stricter multi-turn execution-and-review loop plus a scaffolded executable `plan -> subagent-driven-development -> review-spec -> review-quality -> verify` fixture that carries plan IDs, task IDs, review outcomes, and verification evidence; more task-variation coverage is still needed | `tests/multi-turn-workflows/plan-to-subagent-review-to-verify.md` |
| `tdd` | `test-driven-development` | Comparable | Comparable | Partial | adds trigger/explicit-request pressure coverage for RED-GREEN-REFACTOR depth, bug-fix regression flow, immediate-pass handling, manual shortcut rejection, stuck guidance, minimal code, and delete-and-restart discipline, plus multi-turn workflow depth via `using-agentic -> tdd -> verify` | `tests/explicit-skill-requests/tdd-prompts.md` |
| `review-spec` | request/review system pieces | Partial | Partial | Partial | has multi-turn enforcement that `review-spec` must precede `review-quality`, plus a scaffolded executable `plan -> subagent-driven-development -> review-spec -> review-quality -> verify` fixture that preserves task IDs and explicit review outcomes across turns; review-report depth is still sparse | `tests/multi-turn-workflows/plan-to-subagent-review-to-verify.md` |
| `review-quality` | request/review system pieces | Partial | Partial | Partial | has multi-turn coverage for quality review after spec approval, plus a scaffolded executable `plan -> subagent-driven-development -> review-spec -> review-quality -> verify` fixture that carries forward spec outcomes and verify readiness; severity calibration scenarios remain light | `tests/multi-turn-workflows/plan-to-subagent-review-to-verify.md` |
| `review-final` | final review / branch readiness patterns | Comparable | Partial | Partial | adds a final holistic production-readiness review after task-level reviews and before release/PR; trigger/explicit-request pressure coverage checks integrated diff, verification evidence, security/QA/documentation risk, and that it does not replace `review-spec`/`review-quality`; no dedicated multi-turn final-review chain yet | `tests/explicit-skill-requests/review-final-prompts.md` |
| `review-security` | no exact match; related security review patterns | Unique | Comparable | Partial | adds trigger/explicit-request pressure coverage for auth, untrusted input, secrets, severity, and blocking review-security cases, plus a scoped multi-turn `review-security -> systematic-debugging -> verify` handoff; broader security-review variation is still thin | `tests/explicit-skill-requests/review-security-prompts.md` |
| `design` | partially overlaps brainstorming + design guidance | Unique | Partial | Partial | stronger direction-lock guidance, companion docs, and a scoped multi-turn browser-validation workflow ship; the remaining gap is more pressure-scenario browser-validation coverage | `tests/skill-triggering/design-prompts.md` |
| `systematic-debugging` | `systematic-debugging` / `diagnose` | Comparable | Comparable | Partial | shipped deeper feedback-loop-first diagnosis with deterministic pass/fail signal discipline, flaky repro-rate improvement, ranked falsifiable hypotheses, prediction-based probes, regression seam selection before fixes, temporary-instrumentation cleanup, original symptom verification, no tracker-publishing shortcut, trigger and explicit-request pressure coverage in `tests/explicit-skill-requests/systematic-debugging-prompts.md`, and multi-turn fix handoff coverage in `systematic-debugging-to-fix.md`; broader long-running live debugging demos are still thin | `tests/multi-turn-workflows/systematic-debugging-to-fix.md` |
| `dispatching-parallel-agents` | `dispatching-parallel-agents` | Comparable | Partial | Partial | adds trigger/explicit-request pressure coverage for safe parallelism, shared-state refusal, central merge coordination, and contradiction resolution, plus a scoped multi-turn safe-parallel fanout workflow; broader real-world task variation is still thin | `tests/explicit-skill-requests/dispatching-parallel-agents-prompts.md` |
| `finishing-a-development-branch` | branch-finishing / release-adjacent flow | Partial | Partial | Partial | merged-branch cleanup is covered as an explicit handoff path, and a scoped multi-turn `release -> finishing-a-development-branch` workflow covers release evidence into safe cleanup sequencing, but broader branch-finish pressure cases are still thin | `tests/multi-turn-workflows/release-to-finishing-a-development-branch.md` |
| `requesting-code-review` | `requesting-code-review` | Comparable | Partial | Partial | has multi-turn review-request to response depth, but more PR-state variation is still needed | `tests/multi-turn-workflows/requesting-to-receiving-code-review.md` |
| `receiving-code-review` | `receiving-code-review` | Comparable | Comparable | Partial | adds trigger/explicit-request pressure coverage for external reviewer skepticism, unclear feedback stop/clarify behavior, YAGNI checks, GitHub thread replies, and concrete good/bad technical responses, plus multi-turn reviewer-feedback response coverage | `tests/explicit-skill-requests/receiving-code-review-prompts.md` |
| `gate` | no strong direct counterpart | Unique | Partial | Partial | adds trigger/explicit-request pressure coverage for failing coverage, typecheck, and security blockers plus refusal to wave them through, plus a scoped multi-turn `verify -> gate -> pr` workflow; broader gate recovery flows are still thin | `tests/explicit-skill-requests/gate-prompts.md` |
| `pr` | no strong direct counterpart | Unique | Partial | Partial | adds trigger/explicit-request pressure coverage for what-shipped-together summaries, failing-check draft PR handling, and ready-for-review transitions, plus a scoped multi-turn `verify -> gate -> pr` workflow; full end-to-end PR execution coverage is still lighter than the strongest suites | `tests/explicit-skill-requests/pr-prompts.md` |
| `release` | finishing/release-adjacent flow | Partial | Partial | Partial | adds trigger/explicit-request pressure coverage for semver choice, packaging/readiness blockers, and release-evidence handoffs, plus a scoped multi-turn `release -> finishing-a-development-branch` workflow; release execution depth is still thinner than the best workflow packages | `tests/explicit-skill-requests/release-prompts.md` |
| `worktree` | `using-git-worktrees` | Partial | Partial | Partial | merged-worktree cleanup ships as a first-class end-to-end path with safe local deletion and optional remote deletion, but broader branch-shape pressure cases are still lighter than the richest sets | `tests/multi-turn-workflows/worktree-before-coder.md` |
| `repo` | no strong direct counterpart | Unique | Partial | Partial | adds trigger/explicit-request pressure coverage for base-branch uncertainty, affected packages, transitive dependency impact, and scoped-vs-full verification justification, plus scoped multi-turn `repo -> plan -> subagent-driven-development` and `repo -> scope -> verify` workflows; broader cross-workspace execution examples are still limited | `tests/explicit-skill-requests/repo-prompts.md` |
| `adr` | no strong direct counterpart | Unique | Comparable | Partial | adds trigger/explicit-request pressure coverage for team-is-in-a-hurry pressure, public contract shifts, and expensive-to-reverse decisions before coding, plus a scoped multi-turn `adr -> implementation boundary` workflow; richer ADR artifact examples and follow-through reviews are still sparse | `tests/explicit-skill-requests/adr-prompts.md` |
| `commit` | no strong direct counterpart | Unique | Comparable | Partial | adds trigger/explicit-request pressure coverage for verified conventional commits, hook-failure no-bypass behavior, and follow-up commit discipline, plus a scoped multi-turn `commit after hooks and verification` workflow; deeper staged-diff variation and post-hook flows are still lighter than the best workflow suites | `tests/explicit-skill-requests/commit-prompts.md` |
| `writing-skills` | `writing-skills` | Comparable | Comparable | Partial | has stronger trigger and explicit-request coverage for create/fix/validate a skill package plus a scoped multi-turn `writing skill -> validate -> fix` workflow with carried evidence, but broader repo-local harness depth is still thin | `tests/explicit-skill-requests/writing-skills-prompts.md` |

## Direct Comparison to `/skills/skills`

This direct `/skills/skills` comparison tracks the local external `/skills/skills` repo separately from the `superpowers` matrix above.

- Partial analogues already exist for requirements-to-workflow intake: external `to-prd` maps partially to `requirements-brief`, and external `to-issues` maps partially to `issue-slicing`. The local versions intentionally stay read-only and stop before tracker publishing; tracker triage/publishing remains a separate opt-in future workflow, not part of read-only intake skills.
- `zoom-out` now ships as read-only discovery/orientation for broader repo context before planning, implementation, or code changes; it has no writes and no implementation authority.
- `architecture-deepening` now ships as read-only candidate discovery for shallow/deep modules, seams, dependency categories, behavior-protecting tests, risks/tradeoffs, and handoffs; it does not authorize refactors or implementation.
- `prototype` now ships as approved disposable prototype work for short-lived learning artifacts; it is not production implementation and not a TDD shortcut.
- The remaining selected product gap from the latest deep compare is `requirements-brief` / `issue-slicing` enrichment. Tracker publishing remains separate opt-in future workflow work, not part of read-only intake skills.
- OpenCode plugin dangerous-git guardrails shipped in PR #58. Those guardrails are OpenCode-only, not Claude or Codex hook coverage.

## Biggest Remaining Differences

### 1. Ecosystem and Install Footprint

`superpowers` still leads most clearly in external packaging/distribution reach and total install footprint.

It has materially broader current support across the Claude marketplace, Superpowers marketplace, OpenCode git install, Codex CLI/App guidance, Cursor, GitHub Copilot CLI, and Gemini.

`imitation-machine` currently supports local OpenCode + Claude + minimal local Codex only. Codex support narrows the gap somewhat, but the footprint gap is still substantial even though `imitation-machine` remains ahead on workflow breadth and governance depth.

### 2. Long-Running Real-Agent Examples

`superpowers` still leads on longer-form/live ecosystem demos.

`imitation-machine` leads instead on reproducible executable + installed/live harness evidence for OpenCode/Claude, along with stronger failure/recovery-path workflow coverage on those shared surfaces. It still has fewer longer-running live-session examples.

### 3. Remaining Gaps Are Selective, Not Foundational

Across the matrix, `imitation-machine` is still ahead on workflow breadth (the number of distinct workflow areas covered), governance/review/release coverage, executable workflow fixtures, and failure/recovery handoffs. The remaining gaps are still selective in workflow terms, but the install/distribution footprint gap is broader than this doc previously implied: `superpowers` supports many more surfaces even after the new minimal local Codex coverage.

The current quality/delegation/coding-control wave closed the TDD depth, receiving-review depth, executing-plans isolation, QA/persona drift closed, systematic-debugging depth, and final holistic review-final coverage.

The OpenCode-only dangerous-git guardrails also shipped for the local skill/agent package.

Remaining work is selective: `requirements-brief` / `issue-slicing` enrichment, with tracker publishing separate opt-in work.

## Recommended Next Wave

1. Add a small number of longer-running real-Claude/OpenCode demos that stress continuation, recovery, and handoff quality over more turns.
2. Keep extending failure-path and recovery-path workflow fixtures where they add new behavioral signal, not just more small happy-path fixtures.
3. Deepen the stated remaining gap: `requirements-brief` / `issue-slicing` enrichment, while keeping tracker publishing as separate opt-in work. Additional `repo`, `adr`, `commit`, `dispatching-parallel-agents`, `review-security`, or `review-final` scenarios are optional/opportunistic coverage improvements only when the extra end-to-end coverage is meaningfully distinct.

## Bottom Line

`imitation-machine` is near parity with `superpowers` on core workflow-skill coverage for shared surfaces, and it remains ahead on workflow breadth, governance/review/release coverage, and reproducible executable + installed/live harness evidence for OpenCode/Claude.

`superpowers` is materially ahead on install/distribution footprint and supported surfaces. Codex support narrows that gap somewhat, but `imitation-machine` currently supports local OpenCode + Claude + minimal local Codex only, while `superpowers` has much broader coverage across marketplace and assistant surfaces plus stronger longer-running live-ecosystem demos.
