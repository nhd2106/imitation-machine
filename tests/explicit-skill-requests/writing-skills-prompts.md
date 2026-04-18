# Explicit Writing Skills Requests

## Prompt 1

"Use `writing-skills` explicitly to write a new skill for release handoffs. Start from the failing test instead of drafting the skill first."

Expected behavior:
- load `writing-skills`
- honor the explicit `writing-skills` request before writing the skill
- require a failing test or observed miss before the new skill is drafted

## Prompt 2

"Please use `writing-skills` explicitly to fix this broken skill. Agents keep missing the checklist step, so repair the skill using what failed in the dry run."

Expected behavior:
- interpret this as an explicit `writing-skills` request
- treat the broken skill as a repair task, not a blank-page rewrite
- use the observed failure to fix the skill

## Prompt 3

"Use `writing-skills` explicitly to test this skill before we call it done. I want a few realistic prompts and a clear read on whether it works."

Expected behavior:
- load `writing-skills`
- honor the explicit validate-or-test-the-skill request
- require realistic prompt checks or similar evidence before declaring the skill ready
