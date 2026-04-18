# Multi-Turn Workflow: ADR To Implementation Boundary

## Turn 1

User: "Use `adr` before anyone codes this API gateway change. It alters a public contract, we need durable decision `ADR-019`, and the choice will be expensive to reverse once clients adopt it."

Expected behavior:
- load `adr`
- treat the public contract change as a durable decision, not an implementation detail
- keep `ADR-019` and the expensive to reverse risk explicit before coding starts

## Turn 2

User: "Good. Record the ADR as `ADR-019`, mark it accepted, and keep the implementation boundary explicit. I want the ADR capture itself to say what decision is durable without spilling into task-by-task coding instructions."

Expected behavior:
- continue with `adr`
- record the ADR as `ADR-019` and mark it accepted
- keep the implementation boundary explicit so the durable decision is captured without turning the ADR into an implementation plan

## Turn 3

User: "Now give the implementation handoff. The engineers may code only after `ADR-019` is accepted, and the handoff should carry the durable decision and public contract boundary forward before coding."

Expected behavior:
- make the implementation handoff explicit
- carry forward `ADR-019`, accepted status, the durable decision, and the public contract boundary
- keep the handoff clearly before coding rather than collapsing the ADR step into implementation work
