# Codex Install

Codex is a supported packaged local install surface in this repo.

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

This install creates a local plugin root at:

- `~/plugins/imitation-machine`

Inside that root it:

- copies this repo's checked-in `.codex-plugin/plugin.json`
- copies this repo's `skills/` directory
- updates `~/.agents/plugins/marketplace.json` with Codex marketplace metadata and a local `./plugins/imitation-machine` entry

That gives Codex a minimal local plugin package with access to the imitation-machine skills bundle.

## Limits

- no bootstrap injection
- no hooks
- no `mcpServers`
- no apps
- no agents support
- no live Codex harness claim

## Automated verification

From this source checkout, run:

```bash
bun run test:codex
```

That lane runs the real installer against a temp `CODEX_AGENTS_DIR`, asserts `~/plugins/imitation-machine/.codex-plugin/plugin.json` exists, checks `~/.agents/plugins/marketplace.json`, and confirms the installed `skills` directory contains the packaged skills.

## Verify

In a new Codex session, use the skill tool to list skills and load `using-agentic`.

Expected:

- the local plugin resolves from `~/plugins/imitation-machine`
- `using-agentic` appears in the skill list
- skills load from the linked bundle

If the skills do not appear, re-run:

```bash
./bin/agentic install local --surface codex
```

If Codex does not list the `Local Repo` marketplace after a restart, register the home marketplace with:

```bash
codex plugin marketplace add "$HOME"
```

Then inspect:

- `~/plugins/imitation-machine`
- `~/.agents/plugins/marketplace.json`
- `~/.codex/config.toml`
