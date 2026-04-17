# Multi-Turn Workflow: Worktree Before Coder

## Turn 1

User: "The design is approved. Implement the plan in an isolated workspace."

Expected behavior:
- `@worktree` prepares or verifies isolation before coding
- route through `worktree` before `coder`

## Turn 2

User: "Workspace is ready. Start task TSK-001."

Expected behavior:
- `@coder` starts only after the worktree step is resolved
- keep the handoff explicit as `worktree -> coder`

## Turn 3

User: "Coding is done and verified. Wrap this branch for shipping."

Expected behavior:
- hand off from `coder` into `release`
- clearly cover the `worktree -> coder -> release` workflow depth
