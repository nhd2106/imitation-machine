# Review Quality Trigger Prompts

## Prompt 1

"The feature works, but I want a maintainability and readability review before we merge it."

Expected behavior:
- load `review-quality`
- focus on code clarity, maintainability, and repo fit

## Prompt 2

"Please do a quality review for this finished change after spec review passes."

Expected behavior:
- load `review-quality` after implementation/spec validation is complete
- look for readability, safety, and cleanup issues
