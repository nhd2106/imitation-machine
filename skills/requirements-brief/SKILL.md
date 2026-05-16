---
name: requirements-brief
description: Use when a planning-ready requirements brief is needed from current context before implementation planning, issue slicing, or PO handoff
---

# Requirements Brief

Synthesize current context into a PRD-like requirements brief before planning or issue slicing. This is a read-only skill: no file writes, no issue tracker writes, no implementation.

## When To Use

- A user asks for a PRD, requirements brief, requirements synthesis, product brief, or planning-ready summary.
- Existing conversation, repo docs, issue text, ADRs, or notes need to be consolidated before `plan`, `issue-slicing`, or `@po` handoff.
- Scope boundaries, acceptance criteria, and open questions need to be made explicit before work is broken down.

Do not use this instead of `grill-me` for adversarial interviews. If the user asks to be grilled, challenged, or stress-tested, use `grill-me` first.

## Rules

- Read-only only: no file writes, no issue tracker writes, no implementation, no task plan.
- Inspect existing repo/docs/context first, including available project context and relevant docs.
- Ask the user only for blocking ambiguity that would materially change the brief.
- Preserve uncertainty; do not turn assumptions into resolved decisions.
- Keep the output brief enough to hand to `issue-slicing`, `plan`, or `@po`.

## Output Contract

Produce these sections:

1. Problem
2. Target users
3. Goals/non-goals
4. User stories or scenarios
5. Resolved decisions
6. Open questions
7. Constraints/risks
8. Acceptance criteria/test notes
9. Out-of-scope
10. Recommended next skill/persona: `issue-slicing`, `plan`, or `@po`

## Red Flags

Stop if you catch yourself thinking:

- "I can write the PRD into the repo."
- "I should create tickets while summarizing."
- "The user asked for stress testing, but a requirements brief is close enough."
- "I can plan implementation tasks from unresolved requirements."
