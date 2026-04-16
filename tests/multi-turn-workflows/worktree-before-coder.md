# Multi-Turn Workflow: Worktree Before Coder

## Turn 1

User: "The design is approved. Implement the plan in an isolated workspace."

Expected behavior:
- `@planner` decomposes/decides isolation need
- `@worktree` prepares or verifies isolation before coding

## Turn 2

User: "Workspace is ready. Start task TSK-001."

Expected behavior:
- `@coder` starts only after the worktree step is resolved

## Turn 3

User: "Now review the task properly."

Expected behavior:
- `@reviewer-spec`
- `@reviewer-quality`
