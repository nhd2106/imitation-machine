---
name: prototype
description: Use when a user has approved short disposable exploration to compare interaction, experience, logic, state, or model ideas before committing to production work
---

# Prototype

Use prototypes for approved disposable exploratory work that creates temporary evidence before a real design, plan, or implementation. A prototype is not production implementation.

## When To Use

- A user explicitly approves building a quick spike, demo, mock, throwaway branch artifact, sandbox, or proof-of-concept.
- The goal is learning, de-risking, comparing options, or showing behavior before production follow-up.
- The work can stay isolated from production persistence, secrets, and live backend coupling by default.

Route ambiguous requests or read-only exploration to `zoom-out` or `brainstorm` before prototype approval.

## Hard Gate

Ask one prototype question before artifacts and wait for the answer. Use it to confirm the learning goal, disposal boundary, and how the user will judge the prototype.

## Prototype Types

| Type | Use for | Output |
| --- | --- | --- |
| UI/experience variation | layout, flow, copy, affordances, responsiveness, or visual alternatives | temporary screen, component mock, story, screenshot, or local preview |
| Logic/state/model | branching behavior, data shape, algorithm sketch, state machine, integration contract, or domain model | isolated script, fixture-backed demo, fake adapter, or small sandbox |

## Artifact Rules

- Make visibly disposable artifacts: names, comments, paths, or labels must make clear this is temporary prototype work.
- Keep artifacts easy to remove or absorb later; avoid deep coupling, migrations, permanent public contracts, and unrelated cleanup.
- Include run/view instructions so the user or next agent can reproduce the prototype quickly.
- Require learning/outcome capture before cleanup or production follow-up: what was learned, what failed, what decision it supports, and what remains unknown.

## Handoff Boundaries

| Next skill | Handoff when |
| --- | --- |
| `design` | experience direction or interaction quality needs an approved design before production work. |
| `plan` | the prototype outcome is accepted and needs implementation tasks. |
| `tdd` | production implementation or regression-safe behavior changes begin. |
| `adr` | the prototype reveals an architectural decision, public contract, or expensive-to-reverse tradeoff. |
| `verify` | claiming the prototype runs, demonstrates the learning goal, or is ready for handoff. |

## Red Flags

Stop if you catch yourself:

- using the prototype to bypass `design`, `plan`, or `tdd`
- taking TDD shortcuts for production code because the prototype exists
- keeping prototype as production code without a fresh production plan and tests
- wiring default prototype behavior to production persistence, secrets, or live backends
- hiding missing run/view instructions or skipping learning/outcome capture
