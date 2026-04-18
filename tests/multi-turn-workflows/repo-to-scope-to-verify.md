# Multi-Turn Workflow: Repo To Scope To Verify

## Turn 1

User: "Start with `repo` from base branch `origin/release/2026-q2`. I need the affected packages before any execution choice: right now the likely set is `packages/web` and `packages/config`, and I want that evidence carried forward instead of replaced with a generic monorepo summary."

Expected behavior:
- load `repo`
- keep the exact base branch `origin/release/2026-q2` explicit
- identify the affected packages `packages/web` and `packages/config` and carry that evidence forward

## Turn 2

User: "Stay in `repo` and use that same `origin/release/2026-q2` comparison to decide scoped verification versus full verification. `packages/web` changed directly and `packages/config` feeds shared runtime settings, so I want an explicit scoped verification vs full verification decision instead of a hand-wave."

Expected behavior:
- continue using `repo` rather than dropping the stage context
- carry forward the exact evidence from base branch `origin/release/2026-q2` plus affected packages `packages/web` and `packages/config`
- make an explicit scoped verification versus full verification choice based on dependency impact instead of defaulting blindly

## Turn 3

User: "Because `packages/config` can affect every consumer, move from that repo analysis into `verify` and require fresh `agentic verify all` evidence. Keep the carried evidence about `origin/release/2026-q2`, `packages/web`, and `packages/config` visible when justifying why full verification wins over a scoped verification shortcut."

Expected behavior:
- hand off from `repo` to `verify`
- carry the exact base branch `origin/release/2026-q2` and affected packages `packages/web` and `packages/config` into the verification choice
- require fresh verification with `agentic verify all` and make the full verification decision explicit instead of slipping back to a scoped verification shortcut
