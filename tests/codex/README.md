# Codex Installer Verification

Codex is a supported local install surface in this repo.

That support is intentionally narrow today:

- skills-only install into `CODEX_AGENTS_DIR/skills/imitation-machine`
- no plugin integration
- no bootstrap injection
- no live Codex harness claim

## Automated lane

Run:

```bash
bun run test:codex
```

That command executes the real `scripts/install-local-codex.sh` installer against a temp `CODEX_AGENTS_DIR` and asserts `skills/imitation-machine` points at this repo's `skills/` tree.

## What this does not claim

This repo does not currently claim:

- Codex plugin integration
- Codex bootstrap injection
- a live Codex harness beyond the focused installer verification above
