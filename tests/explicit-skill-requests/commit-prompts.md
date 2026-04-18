# Explicit Commit Requests

Use these prompts to verify explicit `commit` requests trigger verified, traceable, conventional commit behavior.

## Prompt 1

"Use the `commit` skill explicitly. The branch is under pressure to merge tonight, but create a conventional commit only after you confirm the work is verified and the staged scope is still traceable."

Expected behavior:
- immediately load `commit`
- honor the explicit request for verified conventional commit behavior
- preserve traceable scope before creating the commit

## Prompt 2

"Please use `commit` explicitly. Review the staged diff, keep the scope traceable, and draft the final conventional commit message without sneaking unrelated cleanup into the commit."

Expected behavior:
- interpret this as an explicit `commit` request
- preserve traceability and conventional commit discipline

## Prompt 3

"Use `commit` explicitly. The hook failure is annoying, but do not bypass it. Fix what the hook changed or flagged, then make the right follow-up commit instead of taking shortcuts."

Expected behavior:
- load `commit`
- refuse to bypass a hook failure just to get the commit through
- prefer the right follow-up commit flow over shortcutting traceability
