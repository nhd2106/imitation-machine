# Explicit ADR Requests

Use these prompts to verify explicit `adr` requests are honored when the user asks to record an architectural decision before implementation.

## Prompt 1

"Use the `adr` skill explicitly because this architectural decision will be expensive to reverse once we ship the new boundary."

Expected behavior:
- immediately load `adr`
- honor the explicit request to record the architectural decision before coding

## Prompt 2

"Please use `adr` explicitly and compare alternatives for this API contract change before we implement anything."

Expected behavior:
- interpret this as an explicit `adr` request
- document alternatives and decision consequences before implementation
