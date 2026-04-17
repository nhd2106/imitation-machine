# Multi-Turn Workflow: Requesting To Receiving Code Review

## Turn 1

User: "The change is implemented and verified. Help me ask for review on this branch."

Expected behavior:
- load `requesting-code-review`
- prepare a review request that gives reviewers enough context and review request focus

## Turn 2

User: "The reviewers replied with review feedback about test coverage and unclear naming."

Expected behavior:
- transition into `receiving-code-review`
- interpret the review feedback before deciding whether to fix or respond

## Turn 3

User: "I fixed the valid comments. What should I send back?"

Expected behavior:
- summarize the fixes clearly for the reviewers
- keep the response grounded in the received review feedback and next review state
