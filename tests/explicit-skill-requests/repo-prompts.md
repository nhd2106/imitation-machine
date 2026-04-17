# Explicit Repo Requests

Use these prompts to verify explicit `repo` requests trigger repo-aware reasoning about affected packages and dependency impact.

## Prompt 1

"Use the `repo` skill explicitly and tell me which affected packages changed since main before you run tests."

Expected behavior:
- immediately load `repo`
- honor the explicit request for affected packages analysis
- choose scoped verification from repo-aware evidence

## Prompt 2

"Please use `repo` explicitly to inspect dependency impact across the monorepo and explain whether shared package changes widen the blast radius."

Expected behavior:
- interpret this as an explicit `repo` request
- inspect dependency impact instead of guessing package scope
