# PR Trigger Prompts

## Prompt 1

"The branch is verified. Help me open a PR that explains what shipped together and why these changes belong in one review."

Expected behavior:
- load `pr`
- prepare PR traceability around shipped scope and verification evidence
- summarize what shipped together as one coherent delivery unit

## Prompt 2

"I need a lightweight PR body for this work, but one failing check is still blocking verification. If we open the PR now, keep it as a draft PR instead of pretending it is ready."

Expected behavior:
- load `pr`
- summarize grouped work clearly instead of dumping raw commit history
- distinguish ready-vs-draft PR handling based on verification state

## Prompt 3

"This draft PR has gone green now. Help me update the summary so reviewers can see what shipped together, then decide whether it is ready to mark ready for review."

Expected behavior:
- load `pr`
- keep the PR summary tied to shipped scope and verification evidence
- handle the draft-vs-ready transition based on the current verification state
