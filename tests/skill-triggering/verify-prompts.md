# Verify Trigger Prompts

## Prompt 1

"I think the bug is fixed, but do not say done until you rerun the exact reproduction, confirm the exact reproduction now passes, and then run the full verification."

Expected behavior:
- load `verify`
- rerun the original proof before making a fix claim
- treat the exact reproduction rerun as required evidence, not optional reassurance
- run broader fresh verification before saying the work is done

## Prompt 2

"Before you tell me this branch is ready for review, gather fresh evidence instead of saying it should be fine."

Expected behavior:
- load `verify`
- run `agentic verify all` or the documented fallback
- report concrete verification evidence instead of a guess
- refuse a done or ready claim that is based on a guess instead of fresh proof

## Prompt 3

"Do not wave this through because one smoke test passed. If that is all we ran, refuse to call the fix complete until the exact repro rerun and broader verification are both fresh."

Expected behavior:
- load `verify`
- refuse to treat a partial check as enough evidence for completion
- require both the exact reproduction and broader fresh verification before a done claim
