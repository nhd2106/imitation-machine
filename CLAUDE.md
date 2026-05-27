@CODEMAP.md

# Imitation Machine contributor guide

This repository is an enterprise agentic SDLC plugin and CLI. It packages skills, gates, personas, harnesses, and local install surfaces for OpenCode, Claude, and Codex-style workflows.

## Core commands

- Install dependencies: `bun install`
- Run all tests: `bun test`
- Typecheck: `bun run typecheck`
- Verify gates: `./bin/agentic verify all`
- Focused harnesses:
  - `bun run test:harness`
  - `bun run test:workflow-harness`
  - `bun run test:codex`
  - `bun run test:opencode`
  - `bun run test:opencode:live`
  - `bun run test:opencode:installed`
  - `bun run test:claude:installed`

## Workflow expectations

- Use the Imitation Machine skills when planning, implementing, reviewing, verifying, committing, or preparing PRs.
- Prefer a dedicated worktree for non-trivial or risky work so repository state stays isolated.
- Use TDD for behavior changes: write or update focused tests before changing production behavior.
- Follow staged review: spec review first, then quality/security review where relevant.
- Before claiming work is complete, gather fresh verification evidence with the narrowest relevant tests plus `./bin/agentic verify all` when appropriate.
- Keep changes scoped to this plugin/CLI and avoid unrelated documentation or scaffold rewrites.

## Install and development surfaces

Use the CLI to install local development copies for supported agent surfaces:

```sh
./bin/agentic install local --surface opencode
./bin/agentic install local --surface claude
./bin/agentic install local --surface codex
```

When changing installers, skills, gates, or harness behavior, run the matching focused test script from `package.json` and document any user-facing setup or workflow changes.
