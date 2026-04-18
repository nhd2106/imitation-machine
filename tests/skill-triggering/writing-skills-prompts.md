# Writing Skills Trigger Prompts

Use these prompts to verify natural requests to write, repair, or test a skill trigger `writing-skills`.

## Prompt 1

"We keep re-explaining release handoffs in chat. Turn what we learned from the failing test into a reusable skill before you start drafting from scratch."

Expected behavior:
- load `writing-skills`
- treat this as a natural request to write a new skill
- start from a failing test or observed miss before drafting the skill

## Prompt 2

"This skill still is not following the checklist in dry runs. Fix the skill instead of adding another fluffy paragraph."

Expected behavior:
- load `writing-skills`
- treat this as a repair request for an existing skill
- tighten the skill around the observed miss, not generic expansion

## Prompt 3

"Before we ship this skill, try it on a few realistic prompts and check whether it actually teaches the behavior we want."

Expected behavior:
- load `writing-skills`
- treat this as a request to test or validate a skill before shipping it
- ask for or produce concrete checks showing whether the skill works
