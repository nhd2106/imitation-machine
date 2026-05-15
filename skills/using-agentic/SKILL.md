---
name: using-agentic
description: Use when working in a repository that explicitly opts into the Imitation Machine workflow and the task needs the repo's full process, review, and verification discipline
---

# Using Agentic

This is the entrypoint for the full Imitation Machine workflow. It should guide work only in repositories or sessions that explicitly opted into that workflow.

<SUBAGENT-STOP>
If you were dispatched to execute one bounded task with clear instructions, do not restart the whole workflow from here unless the controller told you to.
</SUBAGENT-STOP>

## Instruction Priority

1. User instructions and repo-local instructions
2. Active Imitation Machine skills
3. Default assistant behavior

If a repo or user explicitly wants a narrower workflow, follow that instead of expanding into the full process stack.

## When To Use

- the repository explicitly opts into Imitation Machine
- the task needs the full workflow discipline, not just an isolated skill
- planning, implementation, review, and verification all need to line up under the same system

Do not use this just because the plugin is globally installed.

## The Rule

If the repo explicitly opted in and a process skill might apply, load it before non-discovery work.

## Workflow

```dot
digraph agentic_flow {
  "Task in opted-in repo" [shape=doublecircle];
  "Need full workflow discipline?" [shape=diamond];
  "Load using-agentic" [shape=box];
  "Load process skill" [shape=box];
  "Do work under workflow rules" [shape=box];
  "Complete task-level reviews" [shape=box];
  "Run specialized checks/updates as needed" [shape=box];
  "Run agentic verify all" [shape=box];
  "Run review-final / @reviewer-final" [shape=box];
  "@release / PR / handoff" [shape=box];

  "Task in opted-in repo" -> "Need full workflow discipline?";
  "Need full workflow discipline?" -> "Load using-agentic" [label="yes"];
  "Load using-agentic" -> "Load process skill";
  "Load process skill" -> "Do work under workflow rules";
  "Do work under workflow rules" -> "Complete task-level reviews";
  "Complete task-level reviews" -> "Run specialized checks/updates as needed";
  "Run specialized checks/updates as needed" -> "Run agentic verify all";
  "Run agentic verify all" -> "Run review-final / @reviewer-final";
  "Run review-final / @reviewer-final" -> "@release / PR / handoff";
}
```

Preferred sequence:

Canonical final sequence:

1. implementation and task-level `review-spec` / `review-quality`
2. specialized checks/updates as needed: `review-security` / `@security`, `@qa`, `@docs`
3. fresh `agentic verify all`
4. `review-final` / `@reviewer-final`
5. `@release` / PR / handoff

## Skill Order

1. Process skills decide how to approach the task
2. Review and domain skills constrain the implementation
3. Release skills finalize delivery

## Process Skills

| Situation | Skill |
|---|---|
| New idea or under-specified behavior | `brainstorm` |
| Explicit adversarial clarification before commitment | `grill-me` |
| Approved requirement needs executable tasks | `plan` |
| Approved plan should be executed directly in-session | `executing-plans` |
| Implementation or bug fix | `tdd` |
| Debugging a stubborn failure | `systematic-debugging` |
| Safe fanout of independent agent work | `dispatching-parallel-agents` |

## Supporting Skills

| Situation | Skill |
|---|---|
| Multi-task execution loop | `subagent-driven-development` |
| Architecture decision | `adr` |
| Spec review | `review-spec` |
| Quality review | `review-quality` |
| Security review | `review-security` |
| Preparing a clear review request | `requesting-code-review` |
| Responding to review feedback | `receiving-code-review` |
| Final branch cleanup and handoff | `finishing-a-development-branch` |
| Final holistic production-readiness review | `review-final` |
| PR creation and review-readiness body | `pr` |
| Release readiness, versioning/changelog/tag/publish | `release` |
| Completion verification | `verify` |

Use `release` / `@release` to package release evidence and coordinate delivery-unit packaging. Use `pr` for the actual PR creation path and review-ready body; do not treat `@release` as the sole owner of `gh PR` creation.

## Red Flags

Stop if you catch yourself thinking:

- "The plugin is installed, so every task must use the full workflow"
- "This repo did not opt in, but I should force the workflow anyway"
- "A narrow review task still needs brainstorm and plan first"
- "I should expand the user's request instead of following it"

Those are overreach errors, not rigor.

## Completion Rule

In opted-in workflow sessions, do not claim completion or start final holistic review without fresh evidence from:

```sh
agentic verify all
```

## Companion Files

- `references/opencode-tools.md`
- `references/workflow-cheatsheet.md`
