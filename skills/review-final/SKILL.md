---
name: review-final
description: Use when verified task-level work needs a final holistic production-readiness review after spec and quality reviews but before PR or release handoff
---

# Final Review

Final holistic production-readiness review checks whether the integrated change is ready to hand off. It runs after task-level reviews and before release/PR.

It does not replace `review-spec`, `review-quality`, `review-security`, the `@qa` agent, `gate`, or `verify`. QA is the `@qa` agent in this workflow, not a skill. It confirms their evidence still fits the integrated diff.

## Workflow

```dot
digraph review_final_flow {
  "Task-level reviews complete" [shape=doublecircle];
  "Inspect integrated diff" [shape=box];
  "Check verification evidence" [shape=box];
  "Check security/QA/docs risks" [shape=box];
  "Does this replace earlier gates?" [shape=diamond];
  "Stop: run missing gate" [shape=box];
  "Report final readiness" [shape=box];

  "Task-level reviews complete" -> "Inspect integrated diff";
  "Inspect integrated diff" -> "Check verification evidence";
  "Check verification evidence" -> "Check security/QA/docs risks";
  "Check security/QA/docs risks" -> "Does this replace earlier gates?";
  "Does this replace earlier gates?" -> "Stop: run missing gate" [label="yes"];
  "Does this replace earlier gates?" -> "Report final readiness" [label="no"];
}
```

## What To Check

- integrated diff: does the combined change still make sense as one delivery unit?
- verification evidence: are focused tests, typecheck, and broader verification fresh and relevant?
- security risks: auth, input handling, secrets, persistence, permissions, or unsafe defaults
- QA risks: missing edge-case coverage, untested integration paths, migration/backward-compatibility gaps
- documentation risks: behavior, commands, config, or operational changes not explained
- release/PR readiness: traceability, known concerns, and rollback/follow-up notes are explicit

Use `references/final-review-checklist.md` and report with `final-review-template.md`.

## Boundaries

- Do not re-run Stage 1 spec review as if task-level `review-spec` never happened.
- Do not re-run Stage 2 quality review as if task-level `review-quality` never happened.
- Do not approve when either prior gate is missing, stale, or contradicted by the integrated diff.
- Escalate to `review-security`, `@qa`, or docs/release agents when the final pass finds a specialized risk.

## Red Flags

- treating final review as a shortcut around `review-spec` or `review-quality`
- looking only at the latest commit instead of the integrated diff
- accepting stale verification evidence
- ignoring security, QA, or documentation risks because task-level reviews passed
- saying ready for PR/release without naming concerns and evidence

## Runtime Agent

- In OpenCode, prefer `@reviewer-final` for this read-only final holistic readiness review.

## Companion Files

- `references/final-review-checklist.md`
- `final-review-template.md`
