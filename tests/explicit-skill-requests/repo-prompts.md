# Explicit Repo Requests

Use these prompts to verify explicit `repo` requests trigger repo-aware reasoning about affected packages and dependency impact.

## Prompt 1

"Use the `repo` skill explicitly. This monorepo change touched a shared auth package, and I do not want a full run unless the dependency impact really demands it. Tell me which affected packages changed since the right base branch before you run tests."

Expected behavior:
- immediately load `repo`
- honor the explicit request for affected packages analysis
- resolve the right base branch before trusting affected results
- choose scoped verification from repo-aware dependency impact evidence

## Prompt 2

"Please use `repo` explicitly. The release branch might be `release/next`, not `main`, and shared UI code changed underneath two apps. Inspect the transitive dependency impact and explain whether that widens the blast radius enough to justify a full run."

Expected behavior:
- interpret this as an explicit `repo` request
- inspect transitive dependency impact instead of guessing package scope
- resolve base branch uncertainty before reporting scope

## Prompt 3

"Use `repo` explicitly and be careful here: the branch owner wants only the web tests, but the shared build tooling changed too. Show me the affected packages, the transitive dependency impact, and why that does or does not force a full run."

Expected behavior:
- load `repo`
- use repo-aware evidence to justify staying scoped or switching to a full run
- reason about affected packages and transitive dependency impact before deciding verification scope
