# Review Spec Trigger Prompts

## Prompt 1

"Check whether this implementation actually matches the task we assigned before anyone worries about style."

Expected behavior:
- load `review-spec` before doing a quality pass
- compare the change against the requested behavior and scope

## Prompt 2

"I need a spec compliance review on this branch, including missing acceptance criteria coverage."

Expected behavior:
- load `review-spec`
- focus on requested behavior, gaps, and out-of-scope drift
