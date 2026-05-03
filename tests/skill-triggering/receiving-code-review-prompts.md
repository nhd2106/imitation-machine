# Receiving Code Review Trigger Prompts

Use these prompts to verify review feedback handling triggers the receiving-code-review workflow rather than an immediate unstructured response.

## Prompt 1

"An external reviewer said to replace our compatibility path with the newest API. Help me check whether the review feedback is correct before I push back or fix it."

Expected behavior:
- load `receiving-code-review`
- treat this as receiving code review feedback
- verify external reviewer feedback against codebase reality before acting
- use technical reasoning for fix or push back

## Prompt 2

"The review feedback has six bullets, but items 4 and 5 are unclear. I want to fix the obvious ones now and ask about the unclear ones later."

Expected behavior:
- load `receiving-code-review`
- frame the response around reviewer feedback and planned actions
- stop on unclear feedback and ask for clarification before implementing
- do not implement partial guesses

## Prompt 3

"A GitHub inline review comment asks for a change I fixed. Help me reply so it lands in the original thread, not as a top-level PR comment."

Expected behavior:
- load `receiving-code-review`
- reply in the GitHub thread with concise fix evidence
- avoid a top-level PR comment for an inline review reply

## Prompt 4

"Reviewer asked for a full reporting export because it would be more professional, but no caller uses it yet."

Expected behavior:
- load `receiving-code-review`
- run a YAGNI check before adding unused functionality
- ask whether to defer or remove instead of blindly expanding scope
