# Codex Installer Verification

Codex is a supported packaged local install surface in this repo.

That support is intentionally narrow today:

- local plugin root at `~/plugins/imitation-machine`
- local marketplace registration in `~/.agents/plugins/marketplace.json`
- no bootstrap injection
- minimal manifest only: no hooks, no `mcpServers`, no apps, and no agents support
- no live Codex harness claim

## Automated lane

Run:

```bash
bun run test:codex
```

That command executes the real `scripts/install-local-codex.sh` installer against a temp `CODEX_AGENTS_DIR`, checks `plugin.json`, checks `marketplace.json`, and asserts the installed `skills` entry points at this repo's `skills/` tree.

## What this does not claim

This repo does not currently claim:

- bootstrap injection
- a live Codex harness beyond the focused installer verification above
