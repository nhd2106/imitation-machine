# Repo Trigger Prompts

Use these prompts to verify monorepo-aware work triggers `repo` for affected package and dependency impact reasoning before broad guessing.

## Prompt 1

"This monorepo change touches shared auth utilities. Figure out which affected packages need tests before you run anything expensive."

Expected behavior:
- load `repo`
- identify affected packages from the workspace graph instead of guessing from filenames
- reason about dependency impact before choosing scoped verification

## Prompt 2

"Compare this branch to the right base branch first. If it might be `main` or `release/next`, say that before you tell me whether the web app change also hits the mobile package through shared UI dependencies."

Expected behavior:
- load `repo`
- choose the right base branch before trusting affected results
- inspect transitive dependency impact across packages

## Prompt 3

"Only run the builds that are actually affected by this refactor, but justify that narrower test plan with repo-aware evidence and explain when a full run is safer."

Expected behavior:
- use `repo` to determine affected packages
- avoid full-repo or overly narrow runs without dependency reasoning

## Prompt 4

"The branch target may be `release/next` instead of `main`. Sort out the base branch first, include transitive dependency impact, and justify whether we can stay scoped or need a full run."

Expected behavior:
- load `repo`
- resolve the base branch before reporting affected packages
- justify staying scoped versus running the full repo with dependency evidence
