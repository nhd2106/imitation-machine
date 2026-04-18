# Release Trigger Prompts

## Prompt 1

"We merged the delivery work. Help me decide the semver choice, whether packaging is really ready, and what evidence still blocks the release."

Expected behavior:
- load `release`
- evaluate release readiness using verification evidence and blockers
- make an explicit semver choice based on the shipped change

## Prompt 2

"Prepare a lightweight release handoff with the changelog summary, versioning callout, and release evidence the next person needs to see before cutting the package."

Expected behavior:
- load `release`
- summarize release scope, changelog intent, and versioning implications
- include release evidence handoff details instead of only prose

## Prompt 3

"Do not cut the release if the package artifact is not built, signed, or otherwise packaging-ready. Call out the readiness blocker, recommend the right semver once the blocker is fixed, and hand off the release evidence cleanly."

Expected behavior:
- load `release`
- treat packaging and readiness blockers as stop conditions
- provide a release-evidence handoff rather than claiming the release is ready
