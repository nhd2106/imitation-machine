# Grill Me Trigger Prompts

Use these prompts to verify explicit adversarial clarification requests route to `grill-me` without starting design, planning, or implementation.

## Prompt 1

"Grill me on this feature idea before I commit. Ask one question at a time, and include your recommended answer or default hypothesis with each question."

Expected behavior:
- load `grill-me`
- ask one question and wait for the answer before continuing
- include a recommended answer or hypothesis with the question

## Prompt 2

"Stress-test this rollout proposal and challenge my assumptions around risk, edge cases, and scope, but do not implement anything or write code."

Expected behavior:
- load `grill-me`
- probe assumptions, risk, edge cases, and scope boundaries before commitment
- do not implement or write code while stress testing the proposal

## Prompt 3

"This is still a vague request, not a hard interview. Use normal clarification and do not auto-trigger a grill unless I explicitly ask for one."

Expected behavior:
- do not auto-trigger `grill-me` for a vague request alone
- route normal clarification toward `brainstorm` or `@po`
- explain that `grill-me` is for explicit grill me, stress-test, or challenge-my-assumptions requests
