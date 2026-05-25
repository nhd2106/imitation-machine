---
name: session-handoff
description: Use when ending a work session mid-feature, starting a new session on in-progress work, or resuming after context was lost
---

# Session Handoff

## Overview

Agents lose all memory at session end. On multi-session work, the next session has to reconstruct context from git history and scattered notes — slow and lossy. A `.wip.md` file in the branch root closes that gap: one structured artifact written at the end of every session and read at the start of the next.

**Core principle:** Write it before you stop. Read it before you touch code.

## When To Use

- You are ending a session with work still in progress
- You are opening a new session on a feature started in a prior session
- You lost context mid-session (compaction, restart, long pause)

Do not use for finished branches — use `finishing-a-development-branch` instead, which deletes `.wip.md` as part of cleanup.

## End-of-Session

Before closing the session, write or update `.wip.md` in the branch root:

```sh
# if the file does not exist yet
cp skills/session-handoff/wip-template.md .wip.md
```

Fill in every section honestly. If a section is empty, write "none" — do not skip it. Commit the file:

```sh
git add .wip.md && git commit -m "chore: update wip handoff"
```

## Start-of-Session

Before touching any code, read `.wip.md` and orient with git:

```sh
cat .wip.md
git log --oneline -10
git status
```

Only after reading: resume from **Next**, resolve any **Open Questions** if possible, and watch for **Landmines**.

If `.wip.md` does not exist: run `git log --oneline -20` and `git diff main...HEAD --stat` to reconstruct state manually, then write the file before continuing.

## The `.wip.md` Artifact

See `wip-template.md` for the full template. Key sections:

| Section | What to write |
|---|---|
| **Done** | Completed tasks with any non-obvious decisions noted |
| **Next** | Single most immediate next step — be specific |
| **Open Questions** | Unresolved decisions blocking or affecting Next |
| **Landmines** | Non-obvious dependencies, fragile areas, known gotchas |
| **Last Verified** | When `agentic verify all` last passed |

Keep it honest and brief. A `.wip.md` that says "it's fine" when it isn't is worse than none.

## Integration With Other Skills

**`finishing-a-development-branch`:** delete `.wip.md` when executing Option 1 (merge) or Option 4 (discard):

```sh
git rm .wip.md
git commit -m "chore: remove wip handoff — branch complete"
```

For Option 2 (PR), keep `.wip.md` alive during review iteration; delete it before final merge.

## Red Flags

Stop if you catch yourself about to: touch code without reading `.wip.md` first, end a session without updating `.wip.md`, commit "updated wip" without actually filling in the Next section, or skip `.wip.md` because "I'll remember."

## Companion Files

- `wip-template.md`
