# ADR Trigger Prompts

Use these prompts to verify durable or expensive-to-reverse choices trigger `adr` before implementation locks the decision in.

## Prompt 1

"We're deciding whether to split billing into a new service with its own public API. This architectural change will be expensive to reverse later."

Expected behavior:
- load `adr`
- capture the architectural decision before implementation
- compare real alternatives and record consequences

## Prompt 2

"Change the SDK response shape for all clients and standardize on a new contract across teams."

Expected behavior:
- treat the public contract shift as an ADR-worthy decision
- document decision rationale and downsides before coding

## Prompt 3

"We need to choose one long-term eventing pattern for all new modules, and that choice will shape package boundaries for the next year."

Expected behavior:
- use `adr` for a durable architectural decision
- record alternatives and why the chosen direction is worth the reversal cost
