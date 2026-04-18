# Review Security Trigger Prompts

## Prompt 1

"Review this auth and input-handling change for security risks before we ship it. I need severity called out clearly if untrusted input or authorization mistakes could block the merge."

Expected behavior:
- load `review-security`
- inspect auth, input handling, and persistence risks
- clearly rank security findings by severity instead of generic feedback
- treat exploitable auth or input issues as blocking before merge

## Prompt 2

"This new API route touches secrets and user data, so I want a security-focused review. Check whether secret handling, token exposure, or weak validation creates a high-severity blocker."

Expected behavior:
- load `review-security`
- prioritize threat surfaces instead of general style feedback

## Prompt 3

"We added a password reset flow under deadline pressure. Please review it for auth bypass, secret leakage in logs, and whether any critical finding should block release instead of being waved through."

Expected behavior:
- load `review-security`
- focus on auth, secrets, and security severity
- resist schedule pressure if the review uncovers blocking risk
