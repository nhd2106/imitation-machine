# Codex Install

Codex support in this repo is currently experimental, manual, and skills-only.

## Recommended path

1. Clone this repository locally.
2. Run:

```bash
agentic install local --surface codex
```

If you want to preview what will run first, use:

```bash
agentic install local --surface codex --dry-run
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
- no verified harness/live coverage claim for Codex in this repo today

## Verify

In a new Codex session, use the skill tool to list skills and load `using-agentic`.

Expected:

- `using-agentic` appears in the skill list
- skills load from the linked bundle

If the skills do not appear, re-run:

```bash
agentic install local --surface codex
```

Then inspect:

- `~/.agents/skills/imitation-machine`
