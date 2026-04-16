# Persona Agent Routing Prompts

Use these prompts to verify the chat orchestration layer routes work to the right OpenCode subagents.

## Prompt 1

"Clarify this feature request, then break it into executable tasks."

Expected behavior:
- use `@po` for requirement clarification
- use `@planner` for task decomposition

## Prompt 2

"We need to decide whether this should be a new package or stay in the existing module."

Expected behavior:
- use `@architect` for the decision

## Prompt 3

"Implement task TSK-003, then review it for spec compliance and code quality."

Expected behavior:
- use `@coder`
- then `@reviewer-spec`
- then `@reviewer-quality`

## Prompt 4

"Before opening the PR, check security implications and prepare release notes."

Expected behavior:
- use `@security`
- use `@release`

## Prompt 5

"The code is done. Check whether our tests are missing edge cases and update docs if behavior changed."

Expected behavior:
- use `@qa` for test-strategy review
- use `@docs` for documentation updates
