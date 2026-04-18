# Explicit PR Requests

## Prompt 1

"Use the `pr` skill explicitly. I need a draft PR in the next few minutes, but one failing check is still open, so do not pretend it is ready. Explain what shipped together and why this belongs in one review."

Expected behavior:
- load `pr`
- honor the explicit `pr` request with draft-vs-ready judgment
- explain what shipped together as one review unit
- keep the PR in draft form while the failing check still blocks readiness

## Prompt 2

"Please use `pr` explicitly and rewrite this rushed summary. Reviewers need to see what shipped together, what evidence is already green, and what is still blocking before they waste time on the wrong questions."

Expected behavior:
- interpret this as an explicit `pr` request
- summarize shipped scope and verification state clearly
- keep the PR summary tied to reviewer decision-making instead of raw commit history

## Prompt 3

"Use `pr` explicitly. The draft PR just went green, so update the summary and decide whether it should stay draft PR or move to ready for review."

Expected behavior:
- load `pr`
- reevaluate draft PR versus ready-for-review based on current verification state
- keep the updated summary grounded in what shipped together
