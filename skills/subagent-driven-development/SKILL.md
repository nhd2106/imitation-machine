---
name: subagent-driven-development
description: Use when executing an approved implementation plan task-by-task with fresh workers and mandatory spec-then-quality review loops
---

# Subagent-Driven Development

Execute an approved plan one task at a time with fresh task context and two mandatory review stages.

Why delegation works: the controller keeps coordination context while each runtime agent gets a small, purpose-built prompt. Use a fresh subagent per task so `@coder`, `@reviewer-spec`, and `@reviewer-quality` do not inherit stale assumptions from earlier work. Give each agent exactly the task text, boundaries, and evidence it needs; do not make it rediscover the plan from ambient session history.

Core principle: fresh subagent per task + spec review before quality review = focused implementation with fewer context leaks.

**Continuous execution:** Do not pause to check in between tasks. Execute all tasks from the approved plan without stopping. The only reasons to stop are: a `BLOCKED` status you cannot resolve, ambiguity that genuinely prevents progress, a failed verification that needs the user, or all tasks complete. "Should I continue?" prompts and progress summaries between tasks waste the user's time — they approved the plan, so execute it.

## When To Use

- The plan is approved
- Tasks are mostly independent
- You want tight control over context and review order

Do not use this before planning is complete.

## Core Rule

Every task follows this order:

1. implement
2. spec review
3. fix if needed
4. quality review
5. fix if needed
6. move to next task

Stage 2 never starts before Stage 1 passes.

Canonical final sequence:

1. implementation and task-level `review-spec` / `review-quality`
2. specialized checks/updates as needed: `review-security` / `@security`, `@qa`, `@docs`
3. fresh `agentic verify all`
4. `review-final` / `@reviewer-final`
5. `@release` / PR / handoff

## Controller Workflow

```dot
digraph sdd_flow {
  "Approved plan" [shape=doublecircle];
  "Read all tasks once" [shape=box];
  "Dispatch implementer" [shape=box];
  "Needs context?" [shape=diamond];
  "Answer and re-dispatch" [shape=box];
  "Dispatch spec reviewer" [shape=box];
  "Spec passes?" [shape=diamond];
  "Implementer fixes spec gaps" [shape=box];
  "Dispatch quality reviewer" [shape=box];
  "Quality passes?" [shape=diamond];
  "Implementer fixes quality issues" [shape=box];
  "Mark task complete" [shape=box];
  "More tasks?" [shape=diamond];

  "Approved plan" -> "Read all tasks once";
  "Read all tasks once" -> "Dispatch implementer";
  "Dispatch implementer" -> "Needs context?";
  "Needs context?" -> "Answer and re-dispatch" [label="yes"];
  "Needs context?" -> "Dispatch spec reviewer" [label="no"];
  "Answer and re-dispatch" -> "Dispatch implementer";
  "Dispatch spec reviewer" -> "Spec passes?";
  "Spec passes?" -> "Implementer fixes spec gaps" [label="no"];
  "Implementer fixes spec gaps" -> "Dispatch spec reviewer";
  "Spec passes?" -> "Dispatch quality reviewer" [label="yes"];
  "Dispatch quality reviewer" -> "Quality passes?";
  "Quality passes?" -> "Implementer fixes quality issues" [label="no"];
  "Implementer fixes quality issues" -> "Dispatch quality reviewer";
  "Quality passes?" -> "Mark task complete" [label="yes"];
  "Mark task complete" -> "More tasks?";
  "More tasks?" -> "Dispatch implementer" [label="yes"];
}
```

## Controller Responsibilities

- Read the plan once at the start
- Extract the full task text before dispatching
- Provide exact scope and file boundaries
- Tell implementers to use `tdd`
- let `@planner` mark independent planned task groups so they can fan out when safe
- independent planned task groups may fan out to multiple branches/worktrees/coders in parallel
- shared groups stay together until their shared work and delivery unit are complete
- Answer questions before work proceeds
- Record and respect review outcomes
- Handle implementer status explicitly instead of guessing
- Use real OpenCode subagents when available: `@coder`, `@reviewer-spec`, `@reviewer-quality`, specialized `@security` / `@qa` / `@docs` checks or updates as needed, fresh `agentic verify all`, then `@reviewer-final` before `@release` / PR / handoff

## Companion Files

- `implementer-prompt.md`
- `spec-reviewer-prompt.md`
- `code-quality-reviewer-prompt.md`

## Model Selection

Use the least powerful model that can reliably complete the role, then escalate deliberately when the task demands judgment.

- Mechanical implementation with a complete spec and 1-2 focused files: use a fast model through `@coder`.
- Multi-file integration, debugging, or pattern matching: use a standard model.
- Architecture, design tradeoffs, ambiguous requirements, or high-risk reviews: use the most capable available model and involve the appropriate reviewer or `@architect`.
- If `@coder` reports uncertainty, repeated failure, or a need for broader reasoning, change the prompt, scope, or model before trying again.

## Persona Agent Map

Use the real OpenCode subagents according to role:

- `@po` for requirement clarification before planning
- `@planner` for task decomposition and execution planning
- `@worktree` for workspace isolation/setup before non-trivial coding
- `@architect` for architectural decisions or ADR-shaped questions
- `@coder` for bounded implementation work
- `@qa` for read-only test strategy and edge-case review
- `@security` for read-only security review
- `@reviewer-spec` for Stage 1 spec compliance
- `@reviewer-quality` for Stage 2 code quality review
- `@reviewer-final` for integrated final holistic readiness review
- `@docs` for bounded documentation updates
- `@release` for PR/release readiness, changelog, and traceability

## What To Give The Implementer

Every dispatch should include:

- full task text copied from the plan
- where this task fits in the plan
- allowed files
- verification command
- explicit instruction to follow `tdd`

Do not make the subagent rediscover the task from the repo.

## Implementer Status

Implementers should report one of these statuses:

- `DONE`: task is complete and ready for Stage 1 review
- `DONE_WITH_CONCERNS`: task is complete, but concerns need reading before review
- `NEEDS_CONTEXT`: missing information must be provided before work can continue
- `BLOCKED`: the task cannot proceed without changing context, scope, or plan

Never ignore `NEEDS_CONTEXT` or `BLOCKED`. Change the conditions before redispatching.

Read `DONE_WITH_CONCERNS` before review. If the concern is correctness, scope, architecture, or file growth beyond the plan, resolve it before Stage 1. If `@coder` is blocked, decide whether to add context, narrow the task, choose a more capable model, or escalate the plan back to the human.

**Never ignore an escalation** or force the same agent/model to retry without changing something meaningful.

## Stage 1: Spec Review

Check:

- all requested behavior is present
- nothing extra was built
- tests prove the task, not the implementation details

Persist with:

```sh
agentic gate spec --ref <task-id>
```

## Stage 2: Quality Review

Check:

- readability and naming
- simple control flow
- no avoidable duplication
- no obvious hardcoded values without reason
- no debug leftovers in production paths

Persist with:

```sh
agentic gate quality --ref <task-id>
```

## Red Flags

Never:

- start task 2 while task 1 reviews are unresolved
- run quality review before spec review passes
- make the subagent read the whole plan file if you can provide the exact task text
- ignore implementer questions
- treat reviewer findings as optional
- force a blocked `@coder` to retry without adding context, narrowing scope, or selecting a more suitable model
- accept `DONE_WITH_CONCERNS` without reading the concerns before review
- allow one agent to carry context across unrelated tasks instead of dispatching a fresh subagent per task

## Escalation

Escalate when:

- the same stage fails repeatedly
- the plan is wrong or incomplete
- the task is not actually independent
- the fix would change architecture or requirement scope

Use `agentic audit trace --id <req-id>` to inspect the full chain when needed.

## Example Workflow

```text
Controller: Dispatch implementer with the exact task text, allowed files, and verification command.
Controller: In OpenCode, prefer `@coder` for this role.

Implementer: NEEDS_CONTEXT - should this update the existing JSON format or add a new one?

Controller: Update the existing JSON format only. Re-dispatching with that constraint.

Implementer: DONE - implementation complete, focused test passes.

Controller: Dispatch spec reviewer.
Controller: In OpenCode, prefer `@reviewer-spec` for this role.

Spec reviewer: Issues Found - added an extra CLI flag not requested.

Controller: Send findings back to the same implementer.

Implementer: DONE - removed the extra flag and reran tests.

Controller: Dispatch spec reviewer again, then quality reviewer only after spec passes.
Controller: In OpenCode, prefer `@reviewer-quality` only after Stage 1 passes.
```

