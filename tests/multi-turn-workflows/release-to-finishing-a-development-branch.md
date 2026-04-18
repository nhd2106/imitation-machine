# Multi-Turn Workflow: Release To Finishing A Development Branch

## Turn 1

User: "We are preparing a patch release. Use `release` to choose the version bump and gather the release evidence first: cut v1.4.2, package `dist/imitation-machine-1.4.2.tgz`, and record sha256:9f3c."

Expected behavior:
- load `release`
- keep the exact semver choice `v1.4.2` and release evidence explicit before any branch cleanup
- carry forward the concrete artifact evidence `dist/imitation-machine-1.4.2.tgz` and `sha256:9f3c`

## Turn 2

User: "The release handoff is done: v1.4.2 shipped, `dist/imitation-machine-1.4.2.tgz` and sha256:9f3c are recorded, and the branch is merged into `main`. Now finish the branch with `finishing-a-development-branch` instead of deleting things out of order."

Expected behavior:
- hand off from `release` to `finishing-a-development-branch`
- carry the v1.4.2 release evidence into the branch cleanup decision instead of dropping it between turns
- finish the branch only after the release work is wrapped, the merge into `main` is explicit, and branch cleanup sequencing is clear

## Turn 3

User: "There are no uncommitted changes and `git status: clean`. Complete the safe local cleanup with `git branch -d release/v1.4.2`, then mention that remote deletion is optional."

Expected behavior:
- complete the branch-finish flow with safe local cleanup first, using the clean working tree evidence
- carry the exact branch cleanup evidence `git status: clean` and `git branch -d release/v1.4.2`
- keep optional remote deletion separate from the core finish the branch workflow
