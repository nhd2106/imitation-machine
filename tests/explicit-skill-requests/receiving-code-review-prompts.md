# Explicit Receiving Code Review Requests

## Prompt 1

"Use `receiving-code-review` explicitly for this review feedback. An external reviewer suggested replacing our fallback; treat it as a suggestion, not an order, and verify before fixing."

Expected behavior:
- load `receiving-code-review`
- honor the explicit request by checking external reviewer feedback against the codebase
- use technical reasoning for either a fix or pushback

## Prompt 2

"Use `receiving-code-review` explicitly for this unclear feedback. Items 2 and 3 are vague, so stop and ask for clarification before implementing."

Expected behavior:
- load `receiving-code-review`
- interpret unclear feedback as a stop condition
- ask for clarification rather than implementing partial guesses

## Prompt 3

"Use `receiving-code-review` explicitly. The reviewer wants a future-proof reporting module, but I suspect YAGNI; also help me reply in the GitHub thread after we decide."

Expected behavior:
- load `receiving-code-review`
- honor the explicit YAGNI check before adding unused functionality
- reply in the GitHub thread instead of a top-level PR comment when resolving an inline comment
