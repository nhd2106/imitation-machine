---
name: grill-me
description: Use when the user explicitly asks "grill me", wants to stress-test a proposal, challenge assumptions, or get a hard interview before committing to design, planning, or implementation
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
