# Codex Install

Codex is a supported local install surface in this repo.

The current Codex install remains skills-only.

From this source checkout, use `./bin/agentic` unless `agentic` is already on your `PATH`.

## Recommended path

1. Clone this repository locally.
2. Run:

```bash
./bin/agentic install local --surface codex
```

If you want to preview what will run first, use:

```bash
./bin/agentic install local --surface codex --dry-run
```

## Manual fallback

If you prefer to run the script directly, use:

```bash
./scripts/install-local-codex.sh
```

## What this does

This install only creates a symlink from this repo's `skills/` directory to:

- `~/.agents/skills/imitation-machine`

That gives Codex access to the imitation-machine skills bundle.

## Limits

- no plugin integration
- no bootstrap injection
- no live Codex harness claim

## Automated verification

From this source checkout, run:

```bash
bun run test:codex
```

That lane runs the real installer against a temp `CODEX_AGENTS_DIR` and asserts `skills/imitation-machine` points at this repo's `skills/` tree.

## Verify

In a new Codex session, use the skill tool to list skills and load `using-agentic`.

Expected:

- `using-agentic` appears in the skill list
- skills load from the linked bundle

If the skills do not appear, re-run:

```bash
./bin/agentic install local --surface codex
```

Then inspect:

- `~/.agents/skills/imitation-machine`
