# Claude Code Install

For local development from this source repository, the most reliable path is a packaged local install that registers a local Claude Code development marketplace.

From this source checkout, use `./bin/agentic` unless `agentic` is already on your `PATH`.

## Recommended path

Published package assets include the `agentic` launcher, local install helper scripts, packaged plugin assets, and the `skills/` tree.

1. Clone this repository locally.
2. Run:

```bash
./bin/agentic install local --surface claude
```

3. Start a new Claude Code session.

This packaged local install from this repo uses Claude Code's native plugin system:

- adds a local marketplace from this repo
- installs `imitation-machine@imitation-machine-dev`

If you want to preview what will run first, use:

```bash
./bin/agentic install local --surface claude --dry-run
```

## Manual fallback

If the packaged local install command fails, use this raw plugin-install fallback:

```bash
./scripts/install-local-claude-plugin.sh
```

## Optional local skills symlink

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

If the skills do not appear, first re-run:

```bash
./bin/agentic install local --surface claude
```

If that still fails, check the plugin and marketplace state first:

```bash
claude plugin list
claude plugin marketplace list
```

and confirm `imitation-machine@imitation-machine-dev` is installed.

If that still fails, inspect the symlinks in `~/.claude/skills/` only if you also opted into the optional local skills symlink path, then start a brand new session.

## Mandatory workflow (Claude + OpenCode parity)

The `using-agentic` skill is the policy entrypoint and enforces:

1. skill-first invocation
2. process-skill before implementation
3. `./bin/agentic verify all` evidence before completion claim

Typical follow-on workflow choices now include `systematic-debugging` for stubborn failures, `dispatching-parallel-agents` for safe concurrency, `executing-plans` for approved-plan direct execution, `requesting-code-review` for pre-PR review asks, `receiving-code-review` for reply/fix loops, and `finishing-a-development-branch` for final handoff cleanup.

## Bounded harness verification

The commands below are source-checkout verification helpers, not end-user package install steps.

Repo-local references:

- `scripts/claude-code-harness.ts`
- `tests/claude-executable-harness.test.ts`
- `tests/claude-harness.test.ts`
- `tests/claude-harness-smoke.test.ts`
- `tests/claude-code/README.md`

```bash
bun run test:harness
```

Executable Claude harness lane:

```bash
bun test tests/claude-executable-harness.test.ts
```

Installed Claude integration lane from a source checkout:

```bash
bash tests/claude-code/run-tests.sh installed
```

Set `CLAUDE_INSTALLED_LIVE=1` to run the real installed session. Otherwise the lane skips cleanly after the focused unit coverage.
