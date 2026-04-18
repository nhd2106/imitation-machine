# Explicit ADR Requests

Use these prompts to verify explicit `adr` requests are honored when the user asks to record an architectural decision before implementation.

## Prompt 1

"Use the `adr` skill explicitly. The team is in a hurry, but this new service boundary will be expensive to reverse once customers depend on it, so I want the decision written down before anyone starts coding."

Expected behavior:
- immediately load `adr`
- honor the explicit request to record the architectural decision before coding
- treat expensive to reverse design pressure as a reason to document the decision now

## Prompt 2

"Please use `adr` explicitly. We are about to change a public contract for outside clients, and I need the alternatives, tradeoffs, and fallback plan captured before implementation starts."

Expected behavior:
- interpret this as an explicit `adr` request
- document alternatives and decision consequences before implementation
- capture the fallback plan before implementation when the prompt asks for it
- treat the public contract change as ADR-worthy, not as a quick note

## Prompt 3

"Use `adr` explicitly before this migration moves any further. People keep saying we can decide later, but the database split changes a public contract and will be painful to unwind if we guess wrong."

Expected behavior:
- load `adr`
- record the decision before implementation continues
- capture why the choice is expensive to reverse and why the public contract matters
