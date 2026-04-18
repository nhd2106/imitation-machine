# Explicit Review Security Requests

## Prompt 1

"Use `review-security` explicitly for this auth rollout. Keep it a security review, not a generic quality review, and call out severity if secrets or untrusted input handling create a blocker."

Expected behavior:
- load `review-security`
- honor the explicit `review-security` request before drifting into generic review mode
- assess security severity and blocking risk around auth, secrets, and input handling

## Prompt 2

"Please use `review-security` explicitly on this password-reset endpoint. I want an explicit security review of token handling and validation, with critical or high findings treated as blockers instead of style notes."

Expected behavior:
- interpret this as an explicit `review-security` request
- keep the response anchored in security review rather than generic quality review
- treat critical or high-severity security findings as blocking issues
