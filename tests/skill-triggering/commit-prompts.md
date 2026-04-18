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

"Do not bypass hooks. I want a clean, conventional, traceable commit for this finished unit of work, and any hook failure should block the commit until the underlying issue is fixed."

Expected behavior:
- use `commit`
- preserve conventional commit behavior without skipping verification or hooks

## Prompt 4

"If the commit hook fails before any commit exists, do not bypass it. Fix the problem, stage any hook-written changes, and retry the commit instead of forcing it through."

Expected behavior:
- load `commit`
- keep the no-bypass guidance clear and realistic when hooks fail
- fix the issue before retrying the commit

## Prompt 5

"The previous commit was already pushed, the hook later reformatted files, and I need the correct history discipline. Do not amend pushed history; create a follow-up commit after restaging the hook-written changes."

Expected behavior:
- load `commit`
- make pushed history unambiguous: do not amend it
- restage the hook-written changes and prefer a follow-up commit
