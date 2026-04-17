# Review Security Trigger Prompts

## Prompt 1

"Review this auth and input-handling change for security risks before we ship it."

Expected behavior:
- load `review-security`
- inspect auth, input handling, and persistence risks

## Prompt 2

"This new API route touches secrets and user data, so I want a security-focused review."

Expected behavior:
- load `review-security`
- prioritize threat surfaces instead of general style feedback
