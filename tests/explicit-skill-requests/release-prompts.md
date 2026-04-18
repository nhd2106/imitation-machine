# Explicit Release Requests

## Prompt 1

"Use the `release` skill explicitly. Leadership wants a version number today, but I need the real semver call, not a guess, and I need to know whether the package is actually ready to cut."

Expected behavior:
- load `release`
- honor the explicit `release` request before making a release-readiness claim
- make a semver decision from the shipped change and current evidence
- treat packaging readiness as a real gate, not an assumption

## Prompt 2

"Please use `release` explicitly and prepare the handoff the on-call engineer will need tonight: changelog summary, semver call, and the release evidence that proves we are ready or blocked."

Expected behavior:
- interpret this as an explicit `release` request
- summarize the changelog intent and semver decision clearly
- include release evidence instead of a prose-only handoff

## Prompt 3

"Use `release` explicitly. If the build artifact is missing or packaging is not ready, stop there, call out the blocker, and still leave clean release evidence for the next person."

Expected behavior:
- load `release`
- treat packaging blockers as stop conditions
- hand off release evidence cleanly without claiming the release is ready
