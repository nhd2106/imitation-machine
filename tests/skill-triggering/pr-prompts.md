# PR Trigger Prompts

## Prompt 1

"The branch is verified; help me open a PR with a summary of the delivery unit and the evidence that it is ready."

Expected behavior:
- load `pr`
- prepare PR traceability around shipped scope and verification evidence

## Prompt 2

"I need a lightweight PR body that explains why these grouped tasks belong together."

Expected behavior:
- load `pr`
- summarize grouped work clearly instead of dumping raw commit history
