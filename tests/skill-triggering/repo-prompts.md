# Repo Trigger Prompts

Use these prompts to verify monorepo-aware work triggers `repo` for affected package and dependency impact reasoning before broad guessing.

## Prompt 1

"This monorepo change touches shared auth utilities. Figure out which affected packages need tests before you run anything expensive."

Expected behavior:
- load `repo`
- identify affected packages from the workspace graph instead of guessing from filenames
- reason about dependency impact before choosing scoped verification

## Prompt 2

"Compare this branch to main and tell me whether the web app change also impacts the mobile package through shared UI dependencies."

Expected behavior:
- choose a comparison base before trusting affected results
- inspect transitive dependency impact across packages

## Prompt 3

"Only run the builds that are actually affected by this refactor, but justify the scope using repo-aware evidence."

Expected behavior:
- use `repo` to determine affected packages
- avoid full-repo or overly narrow runs without dependency reasoning
