# Multi-Turn Workflow: Commit After Hooks And Verification

## Turn 1

User: "Use `commit`, but only after fresh verification evidence is on the table. I need `agentic verify all` recorded, the commit path must stay hook-aware, and there is no bypass if a hook complains."

Expected behavior:
- load `commit`
- require explicit verification evidence such as `agentic verify all` before creating a commit
- keep the workflow hook-aware with no bypass shortcut

## Turn 2

User: "The first pre-commit attempt auto-formatted two files and stopped before any commit existed. Stage the hook changes, then retry the commit; do not bypass the hook just because it already touched the files."

Expected behavior:
- keep the pre-commit hook outcome explicit
- respond to the auto-formatted files by staging the hook changes and retrying the commit
- make the retry commit step explicit before any discussion of later history discipline
- avoid talking about amend or follow-up commit discipline before any prior commit exists, and do not bypass after the hook interruption

## Turn 3

User: "Later, a prior commit actually exists on the branch and it was already pushed. A new commit attempt is blocked because one generated snapshot is stale and the hook rejects it. Fix the issue, rerun verification if needed, then restage anything the hook changed and create a follow-up commit; do not amend pushed history, and use no bypass shortcut for the hook."

Expected behavior:
- keep the hook rejection explicit
- fix the issue rather than bypassing the hook
- restage anything the hook changed and prefer a follow-up commit after the pushed prior commit
- make pushed history unambiguous: do not amend it, keep no bypass behavior, and do not force the blocked attempt through
