# Explicit Review Final Requests

## Prompt 1

"Use `review-final` explicitly for final holistic production readiness after the completed task gates; check the integrated diff before release handoff."

Expected behavior:
- load `review-final`
- honor the explicit final holistic production readiness request
- review the integrated diff after completed task gates and before release handoff

## Prompt 2

"Use `review-final` explicitly before release/PR, but don't rerun review-spec or review-quality; verify those after task-level reviews gates exist and then assess security, QA, docs, and verification risk."

Expected behavior:
- load `review-final`
- interpret final review as not replacing review-spec or review-quality
- check verification evidence plus security, QA, and documentation risks
