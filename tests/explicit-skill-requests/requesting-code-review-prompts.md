# Explicit Requesting Code Review Requests

## Prompt 1

"Use the `requesting-code-review` skill explicitly and draft the review ask for this verified branch."

Expected behavior:
- load `requesting-code-review`
- summarize scope, evidence, and reviewer focus

## Prompt 2

"Before I post this PR, use `requesting-code-review` explicitly so the reviewer knows exactly what to inspect."

Expected behavior:
- interpret this as an explicit request for `requesting-code-review`
- produce a scoped review request
- call out risks or follow-ups openly
