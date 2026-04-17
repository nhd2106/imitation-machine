# Commit Trigger Prompts

Use these prompts to verify commit creation requests trigger `commit` only after verified work, with conventional commit behavior and traceability.

## Prompt 1

"The task is verified. Draft a conventional commit message with traceability trailers before you create the commit."

Expected behavior:
- load `commit`
- keep commit behavior tied to verified work
- choose a conventional commit type and preserve traceability

## Prompt 2

"Review the staged changes, make sure the scope is coherent, then create a commit message that explains the real intent."

Expected behavior:
- treat this as commit discipline, not just a raw git action
- ensure the message matches staged scope and verified intent

## Prompt 3

"Do not bypass hooks. I want a clean, conventional, traceable commit for this finished unit of work."

Expected behavior:
- use `commit`
- preserve conventional commit behavior without skipping verification or hooks
