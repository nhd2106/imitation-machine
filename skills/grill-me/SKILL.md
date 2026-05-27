---
name: grill-me
description: Use when the user explicitly asks "grill me", wants to stress-test a proposal, challenge assumptions, or get a hard interview before committing to design, planning, or implementation. Challenges the plan against the existing domain model, sharpens terminology, and updates CONTEXT.md and ADRs inline as decisions crystallise.
---

# Grill Me

Adversarial clarification before commitment. The goal is to pressure-test the idea until the user can make an informed decision, not to design, plan, or implement on their behalf.

## When To Use

Use only for explicit adversarial asks such as:

- "grill me"
- "stress-test this"
- "challenge my assumptions"
- "give me the hard interview before we commit"

Do not auto-trigger for ordinary vague requests. For normal clarification → `brainstorm` or `@po`; planning waits for approved requirements or design, then `plan`.

## Operating Rules

- Ask one question per message.
- Wait for the user's answer before continuing.
- Every question includes a recommended/default answer or hypothesis.
- Inspect repo files/docs instead of asking when the answer is discoverable.
- Stay adversarial but useful: expose weak claims, hidden constraints, and premature commitments.

## Domain Awareness

Before grilling, look for existing documentation:

- `CONTEXT.md` at the repo root — domain glossary and canonical terms
- `CONTEXT-MAP.md` — if multiple bounded contexts exist, it maps them
- `docs/adr/` — recorded architectural decisions

Create files lazily — only when you have something to write. If no `CONTEXT.md` exists, create one when the first term is resolved. If no `docs/adr/` exists, create it when the first ADR is needed.

### Challenge against the glossary

When the user uses a term that conflicts with `CONTEXT.md`, call it out immediately: "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term: "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update CONTEXT.md inline

When a term is resolved, update `CONTEXT.md` right there. Don't batch these up — capture them as they happen. Use the format in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

`CONTEXT.md` is a glossary only — no implementation details, no specs, no scratch pad.

### Offer ADRs sparingly

Only offer to create an ADR when **all three** are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).

## Probe Map

Rotate through the pressure points that matter for the decision:

- Problem: what pain, user, or job is real enough to justify work?
- success criteria: what observable outcome proves the idea worked?
- scope boundaries: what is in, out, postponed, or explicitly not promised?
- assumptions: what must be true for this to be worth doing?
- risks: what could make this costly, unsafe, misleading, or hard to unwind?
- edge cases: which inputs, users, failures, or timing cases change the answer?
- decision dependencies: which unresolved choices block design, planning, or implementation?

## Grill Summary

When the interrogation is complete or the user asks to stop, end with a concise Grill Summary:

- resolved decisions
- remaining open questions
- scope/out-of-scope boundaries
- testable acceptance criteria or requirement notes when appropriate
- recommended next skill/persona: `brainstorm`, `plan`, or `@po`

## Hard Limits

- Must not implement.
- Must not produce task plans.
- Must not write code.
- Must not turn a rough answer into approval for implementation.

## Red Flags

Stop if you catch yourself thinking:

- "This is just normal ambiguity, but I should grill anyway."
- "I can ask a batch of questions to move faster."
- "The repo can answer this, but asking the user is easier."
- "I should convert this into a plan or code now."

## Companion Files

- `CONTEXT-FORMAT.md` — format for CONTEXT.md glossary files
- `ADR-FORMAT.md` — format for architecture decision records
