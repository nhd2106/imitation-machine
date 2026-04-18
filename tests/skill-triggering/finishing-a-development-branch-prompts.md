# Finishing a Development Branch Trigger Prompts

Use these prompts to verify completed implementation work triggers the branch-finishing workflow before handoff.

## Prompt 1

"The feature is done; help me finish the branch and prepare a clean handoff."

Expected behavior:
- treat this as branch-finishing work after implementation
- prepare a clean handoff with branch state and next steps

## Prompt 2

"Before review, I need a branch-finish checklist and a summary of what is deferred."

Expected behavior:
- produce a checklist for finishing the development branch
- summarize deferred work separately from ready-for-review scope

## Prompt 3

"The branch already merged; help me finish cleanup by checking for uncommitted work, removing the worktree, deleting the local branch, and only deleting the remote branch if I ask for it."

Expected behavior:
- treat this as branch-finishing work with explicit merged-cleanup sequencing
- check for uncommitted changes before cleanup
- keep remote deletion optional instead of assuming it
