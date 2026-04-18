# Explicit Verify Requests

## Prompt 1

"Use the `verify` skill explicitly. The PM wants to announce this fix in ten minutes, so rerun the exact reproduction first and do not tell me it is done on gut feel. I need fresh evidence."

Expected behavior:
- load `verify`
- honor the explicit `verify` request before making any done claim
- rerun the exact reproduction before broader verification
- require fresh evidence instead of confidence

## Prompt 2

"Please use `verify` explicitly. We only ran one smoke test after the patch, but support is waiting for an update. Give me fresh evidence, not a hopeful answer, before you say this is ready for review."

Expected behavior:
- interpret this as an explicit `verify` request
- refuse to treat one smoke test as enough proof
- run fresh verification and report concrete evidence

## Prompt 3

"Use `verify` explicitly before you call this fixed. The exact bug repro used to fail on the third step, and I want that exact reproduction rerun plus the broader check before anyone posts a victory message."

Expected behavior:
- load `verify`
- treat the exact reproduction as required evidence for the fix claim
- require broader fresh evidence before any completion or success claim
