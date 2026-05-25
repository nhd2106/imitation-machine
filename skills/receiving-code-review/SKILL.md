---
name: receiving-code-review
description: Use when responding to review feedback, deciding what to fix now, and communicating resolution clearly back to the reviewer
---

# Receiving Code Review

## Overview

Treat review comments as inputs to resolve, not friction to out-argue. Code review requires technical evaluation, not emotional performance. A runtime agent may draft fixes or evidence, but the controller owns the response quality.

**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.

## The Response Pattern

```text
WHEN receiving code review feedback:

1. READ      — complete feedback without reacting
2. UNDERSTAND — restate the requirement in your own words (or ask)
3. VERIFY    — check against codebase reality
4. EVALUATE  — technically sound for THIS codebase, in this version?
5. RESPOND   — technical acknowledgment or reasoned pushback
6. IMPLEMENT — one item at a time, test each
```

## Workflow

1. Restate each review point before changing code or docs.
2. Verify the feedback against the task, codebase, tests, and existing decisions.
3. Classify it as must-fix, clarify, reject, or defer with rationale.
4. If any feedback is unclear, stop and ask before implementing partial guesses.
5. Apply the needed change one item at a time. Test each fix individually.
6. Capture the response in `fix-summary-template.md`.
7. Use `references/review-response-checklist.md` before replying.
8. Reply with the fix, evidence, or concise technical reasoning.

## Forbidden Responses

**Never:**

- "You're absolutely right!"
- "Great point!"
- "Excellent feedback!"
- "Thanks for catching that!" / any gratitude expression
- "Let me implement that now" — before verification

**Instead:**

- Restate the technical requirement
- Ask a clarifying question
- Push back with technical reasoning when wrong
- Just start working — actions over words

If you catch yourself about to write "Thanks": delete it. State the fix. The code itself shows you heard the feedback.

## Source-Specific Handling

### User feedback (from your human collaborator)

- High-priority direction once you understand it.
- Still ask when scope, acceptance criteria, or tradeoff is unclear.
- Skip performative agreement; respond with the action, evidence, or precise question.

### External reviewer feedback

Before implementing:

1. Check: technically correct for THIS codebase, runtime, version?
2. Check: does it break existing functionality?
3. Check: is there a reason for the current implementation?
4. Check: does it work across all platforms/versions we support?
5. Check: does the reviewer have full context?

If the suggestion seems wrong: push back with technical reasoning.
If you cannot verify a claim cheaply: say so. "I can't verify this without [X]. Should I [investigate / ask / proceed]?"
If it conflicts with user-approved decisions: stop and escalate before changing code.

External reviewer feedback is a **suggestion to evaluate**, not an **order to follow**.

## Handling Unclear Feedback

If any feedback item is unclear, stop and ask for clarification before implementing partial guesses. Items may be related; partial understanding produces wrong implementations.

Bad:

```text
Reviewer: "Fix items 1-6."
Agent: implements 1, 2, 3, and 6 while guessing at 4 and 5 later.
```

Good:

```text
Agent: "I understand 1, 2, 3, and 6. Need clarification on 4 and 5 before implementing so related changes do not conflict."
```

## YAGNI Check

When a reviewer asks for a more "complete", "professional", or "future-proof" feature, verify it is actually needed now.

```text
IF reviewer suggests "implementing properly":
  grep the codebase for actual usage

  IF unused: "This endpoint is not called. Remove it (YAGNI)?"
  IF used:   then implement properly
```

## Implementation Order

For multi-item feedback:

1. Clarify anything unclear first.
2. Then implement in this order:
   - **Blocking** issues (breaks, security)
   - **Simple** fixes (typos, imports, naming)
   - **Complex** fixes (refactoring, logic, control flow)
3. Test each fix individually.
4. Verify no regressions with the relevant scoped command, then `agentic verify all` before reporting back.

## When To Push Back

Push back when the suggestion:

- breaks existing functionality
- comes from a reviewer who lacks full context
- violates YAGNI (unused feature)
- is technically incorrect for this stack, version, or runtime
- conflicts with the user's prior architectural decisions
- has a legacy/compatibility reason that is not obvious from the diff

How to push back:

- use technical reasoning, not defensiveness
- ask a specific question rather than rejecting outright
- reference working tests, code, or prior decisions
- involve the user if the disagreement is architectural

## Acknowledging Correct Feedback

When the feedback is correct:

```text
✅ "Fixed. [brief description of what changed]"
✅ "Good catch — [specific issue]. Fixed in [location]."
✅ [just fix it and show in the code]
```

```text
❌ "You're absolutely right!"
❌ "Great point!"
❌ "Thanks for catching that!"
```

Actions speak. State the fix. Move on.

## Gracefully Correcting Your Pushback

If you pushed back and were wrong:

```text
✅ "You were right — I checked [X] and it does [Y]. Implementing now."
✅ "Verified this and you're correct. My initial understanding was wrong because [reason]. Fixing."
```

```text
❌ Long apology
❌ Defending why you pushed back
❌ Over-explaining
```

State the correction factually and move on.

## GitHub Thread Replies

When replying to inline GitHub review comments, reply **in the original review thread**, not as a top-level PR comment. With the GitHub CLI:

```sh
gh api repos/{owner}/{repo}/pulls/{pr}/comments/{comment_id}/replies \
  --method POST -f body="<reply>"
```

Top-level PR summaries are for overall status. Thread replies are for the specific comment resolution and evidence.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Performative agreement | State the requirement, or just act. |
| Blind implementation | Verify against codebase first. |
| Batch without testing | One at a time, test each. |
| Assuming reviewer is right | Check if it breaks things. |
| Avoiding pushback | Technical correctness > comfort. |
| Partial implementation | Clarify all items first. |
| Can't verify, proceed anyway | State limitation, ask for direction. |

## Good And Bad Examples

**Performative agreement (bad):**

```text
Reviewer: "Remove legacy code"
❌ "You're absolutely right! Let me remove that..."
```

**Technical verification (good):**

```text
Reviewer: "Remove legacy code"
✅ "Checking… build target is 10.15+, this API needs 13+. Need legacy for backward compat. The current impl has the wrong bundle ID — fix it, or drop pre-13 support?"
```

**YAGNI (good):**

```text
Reviewer: "Implement proper metrics tracking with database, date filters, CSV export"
✅ "Grepped codebase — nothing calls this endpoint. Remove it (YAGNI)? Or is there usage I am missing?"
```

**Unclear item (good):**

```text
User: "Fix items 1-6"
You understand 1, 2, 3, 6. Unclear on 4, 5.
✅ "Understand 1, 2, 3, 6. Need clarification on 4 and 5 before implementing."
```

## Red Flags

Stop if you catch yourself:

- responding defensively before understanding the review point
- marking feedback resolved without verification
- burying deferred items instead of naming them
- letting a runtime agent argue with the reviewer on vague evidence
- implementing unclear feedback instead of asking first
- blindly accepting external feedback without checking the codebase
- adding unused functionality without a YAGNI check
- offering performative agreement such as "great point" instead of a technical response

## The Bottom Line

External feedback is a suggestion to evaluate, not an order to follow.

Verify. Question. Then implement.

No performative agreement. Technical rigor always.

## Companion Files

- `references/review-response-checklist.md`
- `fix-summary-template.md`
