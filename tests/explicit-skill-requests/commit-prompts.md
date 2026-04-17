# Explicit Commit Requests

Use these prompts to verify explicit `commit` requests trigger verified, traceable, conventional commit behavior.

## Prompt 1

"Use the `commit` skill explicitly and create a conventional commit only after you confirm the work is verified."

Expected behavior:
- immediately load `commit`
- honor the explicit request for verified conventional commit behavior

## Prompt 2

"Please use `commit` explicitly to review the staged diff, keep the scope traceable, and draft the final conventional commit message."

Expected behavior:
- interpret this as an explicit `commit` request
- preserve traceability and conventional commit discipline
