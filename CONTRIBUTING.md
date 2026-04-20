# Contributing

Thanks for contributing to `@duoc95/imitation-machine`.

## Repo checkout setup

Work from a local checkout of this repository with Bun installed.

```bash
bun install
./bin/agentic mode show
```

## Keep changes bounded

- Make single-purpose changes.
- Keep the PR scoped to one clear outcome.
- Avoid mixing unrelated docs, workflow, CLI, or test changes in the same PR.
- If a change grows beyond one bounded outcome, split it into follow-up work.

## Expected review flow

Before calling work complete, use the staged review order:

`review-spec` → `review-quality` → `verify`

If the change touches auth, secrets, user input, API handlers, payments, or other sensitive paths, include `review-security` before `verify`.

## Final verification

Run this exact command from the repo root before asking for review or claiming completion:

```bash
./bin/agentic verify all
```

`./bin/agentic verify all` is the canonical final local readiness check in this repo.

## Troubleshooting optional focused checks

If `./bin/agentic verify all` fails and you need to isolate the cause, you can optionally run these focused checks from the repo root:

```bash
./bin/agentic gate all
bunx tsc --noEmit
bun test
```

## Pull requests

Use the repository pull request template. It asks for:

- a short summary
- traceability links or IDs
- scope boundaries
- verification and review status
- reviewer focus
- known risks and follow-ups

Keep the submitted PR aligned with the bounded change you verified locally.
