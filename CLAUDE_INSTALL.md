# Claude Code Install

For local development, the most reliable path is a local development marketplace install.

## Local install (recommended while iterating)

1. Clone this repository locally.
2. Run:

```bash
./scripts/install-local-claude-plugin.sh
```

3. Start a new Claude Code session.

This uses Claude Code's native plugin system:

- adds a local marketplace from this repo
- installs `imitation-machine@imitation-machine-dev`

## Optional loose-skill install

If you want the skills visible directly under `~/.claude/skills/` while iterating, also run:

```bash
./scripts/install-local-claude.sh
```

## Verify

In a fresh Claude Code session, ask the agent to:

```text
Use Skill tool to list available skills and then load using-agentic.
```

Expected:

- `using-agentic` appears in skill list
- `using-agentic` loads successfully
- workflow then routes through process skills (`brainstorm`/`plan`/`tdd`) before implementation actions
- expanded workflow skills appear, including `systematic-debugging`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, `requesting-code-review`, and `receiving-code-review`

If the skills do not appear, inspect the symlinks in `~/.claude/skills/` and start a brand new session.

If the plugin itself does not appear, run:

```bash
claude plugin list
claude plugin marketplace list
```

and confirm `imitation-machine@imitation-machine-dev` is installed.

For the bounded repo-local Claude harness, see:

- `scripts/claude-code-harness.ts`
- `tests/claude-executable-harness.test.ts`
- `tests/claude-harness.test.ts`
- `tests/claude-harness-smoke.test.ts`
- `tests/claude-code/README.md`

The executable Claude harness lane is covered directly with:

```bash
bun test tests/claude-executable-harness.test.ts
```

## Mandatory workflow (Claude + OpenCode parity)

The `using-agentic` skill is the policy entrypoint and enforces:

1. skill-first invocation
2. process-skill before implementation
3. `agentic verify all` evidence before completion claim

Typical follow-on workflow choices now include `systematic-debugging` for stubborn failures, `dispatching-parallel-agents` for safe concurrency, `executing-plans` for approved-plan direct execution, `requesting-code-review` for pre-PR review asks, `receiving-code-review` for reply/fix loops, and `finishing-a-development-branch` for final handoff cleanup.

## Bounded harness verification

```bash
bun run test:harness
```
