# Explicit Verify Requests

## Prompt 1

"Use the verify skill before you tell me this is done."

Expected behavior:
- load `verify`
- run fresh verification before any completion claim

## Prompt 2

"Verify everything and give me evidence, not confidence."

Expected behavior:
- run `agentic verify all`
- report concrete results
