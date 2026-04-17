# Verify Trigger Prompts

## Prompt 1

"I think the bug is fixed, but do not say done until you rerun the exact reproduction and then the full verification."

Expected behavior:
- load `verify`
- rerun the original proof before making a fix claim
- run broader fresh verification before saying the work is done

## Prompt 2

"Before you tell me this branch is ready for review, gather fresh evidence instead of giving me confidence language."

Expected behavior:
- load `verify`
- run `agentic verify all` or the documented fallback
- report concrete verification evidence instead of a guess
