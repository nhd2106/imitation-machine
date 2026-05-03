---
name: receiving-code-review
description: Use when responding to review feedback, deciding what to fix now, and communicating resolution clearly back to the reviewer
---

# Receiving Code Review

## Overview

Treat review comments as inputs to resolve, not friction to out-argue. A runtime agent may draft fixes or evidence, but the controller owns the response quality.

Core principle: Verify before implementing. Ask before assuming. Technical correctness beats performative agreement.

## Workflow

1. Restate each review point before changing code or docs.
2. Verify the feedback against the task, codebase, tests, and existing decisions.
3. Classify it as must-fix, clarify, reject, or defer with rationale.
4. If any feedback is unclear, stop and ask before implementing partial guesses.
5. Apply the needed change one item at a time, then capture the response in `fix-summary-template.md`.
6. Use `references/review-response-checklist.md` before replying.
7. Reply with the fix, evidence, or concise technical reasoning.

## Source-Specific Handling

### Human Partner Feedback

- Treat it as high-priority direction after you understand it.
- Still ask for clarification when scope, acceptance criteria, or tradeoff is unclear.
- Skip performative agreement; respond with the action, evidence, or precise question.

### External Reviewer Feedback

- External reviewer feedback is a suggestion to evaluate, not an order to follow blindly.
- Check whether the suggestion is technically correct for this codebase, platform, dependency version, and requirement.
- Look for context the external reviewer may not have: prior decisions, compatibility constraints, tests, or planned follow-up scope.
- Push back with technical reasoning when the suggestion is wrong, risky, or out of scope.
- If it conflicts with human-approved decisions, stop and escalate before changing code.

## Handling Unclear Feedback

If any feedback item is unclear, stop and ask for clarification before implementing partial guesses.

Bad:

```text
Reviewer: "Fix items 1-6."
Agent: implements 1, 2, 3, and 6 while guessing at 4 and 5 later.
```

Good:

```text
Agent: "I understand 1, 2, 3, and 6. Need clarification on 4 and 5 before implementing so related changes do not conflict."
```

## Review Evaluation

- External reviewer feedback is a suggestion to evaluate, not an order to follow blindly.
- Be skeptical, but check carefully: confirm whether the suggestion fits this repo, platform, and requirement.
- Run a YAGNI check before adding "proper" features that are not used or requested.
- If the suggestion conflicts with prior decisions, architecture, or scope, stop and escalate.
- If you cannot verify a claim cheaply, say what evidence is missing and ask how to proceed.

## YAGNI Check

When a reviewer asks for a more "complete", "professional", or "future-proof" feature, verify it is actually needed now.

- Search for current callers or acceptance criteria.
- If unused, ask whether to remove or defer it instead of building it.
- If used, implement the smallest correct fix and test it.

Good:

```text
"Grepped the codebase; nothing calls this endpoint. Should we remove it or keep a documented follow-up instead of adding filters now?"
```

## GitHub Thread Replies

When replying to inline GitHub review comments, reply in the original review thread, not as a top-level PR comment. With GitHub CLI, use the pull request review comment replies endpoint (`gh api repos/{owner}/{repo}/pulls/{pr}/comments/{comment_id}/replies`) when automation is needed.

Top-level PR summaries are for overall status. Thread replies are for the specific comment resolution and evidence.

## Good And Bad Examples

Bad performative agreement:

```text
"Great point, you're absolutely right. I'll implement that now."
```

Good technical response:

```text
"Checked the target runtime: the suggested API requires v18, but this package supports v16. Keeping the compatibility path and adding a regression test for the failing case."
```

Bad blind implementation:

```text
"External reviewer asked for CSV export, so I added a full reporting module."
```

Good YAGNI response:

```text
"No current caller needs CSV export and it is outside the task. Deferring unless you want to expand scope."
```

## Red Flags

- Responding defensively before understanding the review point
- Marking feedback resolved without verification
- Burying deferred items instead of naming them
- Letting a runtime agent argue with the reviewer on vague evidence
- Implementing unclear feedback instead of asking first
- Blindly accepting external feedback without checking the codebase
- Adding unused functionality without a YAGNI check
- Offering performative agreement such as "great point" instead of a technical response

No performative agreement: either make the fix with evidence, ask a concrete question, or push back with technical reasoning.

## Companion Files

- `references/review-response-checklist.md`
- `fix-summary-template.md`
