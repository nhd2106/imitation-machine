# Explicit Grill Me Requests

## Prompt 1

"Use `grill-me` explicitly. I want a hard interview that will challenge my assumptions before we decide whether this idea deserves a plan."

Expected behavior:
- load `grill-me`
- honor the explicit `grill-me` request as adversarial clarification before commitment
- ask one question at a time with a recommended/default answer or hypothesis

## Prompt 2

"Please use `grill-me` explicitly to stress-test this proposal; include your hypothesis with each question and stop short of implementation planning."

Expected behavior:
- interpret this as an explicit `grill-me` request
- stress-test the proposal with one question at a time and a recommended answer or hypothesis
- avoid implementation planning until a later approved `plan` handoff

## Prompt 3

"Use `grill-me` explicitly, but do not implement or write code. End with a Grill Summary of decisions, open questions, boundaries, and next skill."

Expected behavior:
- load `grill-me`
- honor the explicit no-code boundary while probing the idea
- end with a Grill Summary instead of a task plan or implementation
