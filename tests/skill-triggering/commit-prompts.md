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

"Do not bypass hooks. I want a clean, conventional, traceable commit for this finished unit of work, and a hook failure must stay a hook failure until fixed."

Expected behavior:
- use `commit`
- preserve conventional commit behavior without skipping verification or hooks

## Prompt 4

"If the commit hook fails, do not use any no-bypass shortcut. Fix the problem and create the right follow-up commit instead of forcing it through."

Expected behavior:
- load `commit`
- refuse no-bypass behavior when hooks fail
- fix the issue before creating the commit

## Prompt 5

"The previous commit was already pushed, the hook later reformatted files, and I need the correct history discipline. Decide whether this needs a follow-up commit versus amend, but do not rewrite history casually."

Expected behavior:
- load `commit`
- apply follow-up commit vs amend discipline based on whether the prior commit was created locally and pushed
- avoid rewriting history when a follow-up commit is the safe path
