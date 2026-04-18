# ADR Trigger Prompts

Use these prompts to verify durable or expensive-to-reverse choices trigger `adr` before implementation locks the decision in.

## Prompt 1

"We're deciding whether to split billing into a new service with its own public API. That would be expensive to reverse later, so capture the decision before coding starts."

Expected behavior:
- load `adr`
- capture the architectural decision before implementation
- compare real alternatives and record consequences

## Prompt 2

"Change the SDK response shape for all clients and standardize on a new public contract across teams before implementation starts."

Expected behavior:
- treat the public contract shift as an ADR-worthy decision
- document decision rationale and downsides before coding

## Prompt 3

"We need to choose one long-term eventing pattern for all new modules, and that choice will shape package boundaries for the next year."

Expected behavior:
- use `adr` for a durable architectural decision
- record alternatives and why the chosen direction is worth the reversal cost

## Prompt 4

"The team is in a hurry to start coding, but this tenant-isolation design will lock in storage boundaries and migration costs for years. Do not skip the ADR just to move faster today."

Expected behavior:
- load `adr`
- resist schedule pressure to skip the ADR
- require the expensive-to-reverse decision to be documented before coding
