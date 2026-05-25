---
name: finishing-a-development-branch
description: Use when implementation is done and a branch needs final verification, cleanup, and handoff before review or merge
---

# Finishing a Development Branch

## Overview

Finish the branch by proving it is handoff-ready, not by assuming recent progress is enough. A runtime agent can help gather evidence, but the controller must decide readiness.

**Core principle:** Verify tests → detect environment → present options → execute choice → clean up safely.

## Workflow

The process below applies whether the branch is fresh or already merged. For an **already merged** branch, follow the same six steps but use the merged-cleanup ordering: check for uncommitted changes, remove the worktree, delete the merged local branch, and delete the remote branch only if explicitly requested. Never assume merged means safe to drop without inspection.

## The Process

### Step 1: Verify Tests And Gates

Before presenting any option, verify the branch is actually finishable:

```sh
bun test                  # full test suite
bunx tsc --noEmit         # typecheck
agentic verify all        # IM canonical verification (gate + typecheck + tests)
```

If anything fails:

```text
Verification failed. Cannot proceed with merge/PR until this is resolved.

[Show the failure summary, exit codes, and the specific gate or test that broke.]
```

Stop. Do not proceed to Step 2.

### Step 2: Detect Environment

Determine the workspace state before presenting options:

```sh
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

| State | Menu | Cleanup behavior |
|---|---|---|
| `GIT_DIR == GIT_COMMON` (normal repo) | Standard 4 options | No worktree to clean up |
| `GIT_DIR != GIT_COMMON`, named branch | Standard 4 options | Provenance-based (see Step 6) |
| `GIT_DIR != GIT_COMMON`, detached HEAD | Reduced 3 options (no merge) | No cleanup (externally managed) |

Submodule guard: `GIT_DIR != GIT_COMMON` is also true inside git submodules. Before concluding "this is a worktree," check `git rev-parse --show-superproject-working-tree` — if that returns a path, treat as a normal repo, not a worktree.

### Step 3: Determine The Base Branch

```sh
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

If both fail or the answer is ambiguous, ask: "This branch split from `<base>` — is that correct?"

### Step 4: Present Options

**Normal repo and named-branch worktree — present exactly these 4 options:**

```text
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I will handle it later)
4. Discard this work

Which option?
```

**Detached HEAD — present exactly these 3 options (no local merge):**

```text
Implementation complete. You are on a detached HEAD (externally managed workspace).

1. Push as new branch and create a Pull Request
2. Keep as-is (I will handle it later)
3. Discard this work

Which option?
```

Do not add explanation. Keep the options concise.

### Step 5: Execute The Chosen Option

#### Option 1 — Merge Locally

```sh
# Get the main repo root for CWD safety
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"

git checkout <base-branch>
git pull
git merge <feature-branch>

# Verify tests on the merged result
agentic verify all
```

Only after the merge succeeds and verification is green: cleanup worktree (Step 6), then delete the branch:

```sh
git branch -d <feature-branch>
```

#### Option 2 — Push And Create A PR

Hand the actual PR body to the `pr` skill. At minimum:

```sh
git push -u origin <feature-branch>

gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary

<2-3 bullets of what changed and why>

## Test Plan

- [ ] <verification steps>
- [ ] `agentic verify all` passed
EOF
)"
```

**Do not clean up the worktree.** The user needs it alive to iterate on PR feedback.

#### Option 3 — Keep As-Is

Report: `Keeping branch <name>. Worktree preserved at <path>.`

Do not clean up the worktree.

#### Option 4 — Discard

Require typed confirmation:

```text
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for the exact word `discard`. On confirmation:

```sh
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

Then cleanup worktree (Step 6), then force-delete the branch:

```sh
git branch -D <feature-branch>
```

### Step 6: Cleanup Workspace

Only runs for Options 1 and 4. Options 2 and 3 always preserve the worktree.

```sh
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

- If `GIT_DIR == GIT_COMMON`: normal repo. No worktree to clean up. Done.
- If the worktree path is under `.worktrees/`, `worktrees/`, or a previously declared project-local worktree directory: IM created this worktree — we own cleanup.

  ```sh
  MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
  cd "$MAIN_ROOT"
  agentic worktree remove --path "$WORKTREE_PATH" --delete-branch
  ```

  For multi-worktree merged-cleanup, prefer the preview-then-apply flow:

  ```sh
  agentic worktree cleanup-merged --json     # preview candidates
  agentic worktree cleanup-merged --apply    # execute
  ```

  Add `--delete-remote` only when the user explicitly asks for the remote branches removed too.

- Otherwise: the host environment (your harness) owns this workspace. **Do not remove it.** If your platform provides a workspace-exit tool, use it. Otherwise leave the workspace in place.

## Quick Reference

| Option | Merge | Push | Keep worktree | Cleanup branch |
|---|---|---|---|---|
| 1. Merge locally | yes | – | – | yes |
| 2. Create PR | – | yes | yes | – |
| 3. Keep as-is | – | – | yes | – |
| 4. Discard | – | – | – | yes (force) |

## Common Mistakes

| Mistake | Reality |
|---|---|
| Skipping verification before offering options | You will merge broken code or open a failing PR. Always run `agentic verify all` first. |
| Open-ended questions like "what next?" | Ambiguous. Present exactly 4 (or 3) structured options. |
| Cleaning up the worktree for Option 2 | The user needs it for PR iteration. Only cleanup for Options 1 and 4. |
| Deleting the branch before removing the worktree | `git branch -d` fails because the worktree still references the branch. Order: merge → remove worktree → delete branch. |
| Running `git worktree remove` from inside the worktree | Fails silently. Always `cd` to main repo root first. |
| Cleaning up worktrees you did not create | Causes phantom state in the harness. Check provenance before removing. |
| Discarding without typed confirmation | Accidental data loss. Require the exact word `discard`. |
| Mixing deferred follow-ups into the handoff | Hides risk. Keep follow-ups separate. |

## Red Flags

Stop if you are about to: proceed with failing tests, delete work without typed confirmation, force-push without explicit request, remove a worktree you did not create, or run `git worktree remove` from inside the worktree.

## Handoff Summary

Use `branch-hand-off-template.md`: what changed, how it was verified, known follow-ups, open risks. Hand off with evidence, not memory.

## Companion Files

- `references/branch-finish-checklist.md`
- `branch-hand-off-template.md`
