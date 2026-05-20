# Explicit Prototype Requests

Use these prompts to verify explicit `prototype` requests keep prototype work disposable, approval-gated, and separate from production implementation.

## Prompt 1

"Use `prototype` explicitly to make a quick UI prototype for the onboarding welcome screen so we can compare two visual prototype variations before choosing one."

Expected behavior:
- load `prototype` because the user made an explicit disposable UI prototype request
- ask one prototype question and wait before artifacts to confirm the learning goal, disposal boundary, and judgment criteria
- keep the screen prototype focused on visual variation and reviewable interaction feel
- avoid production hardening until the preferred direction is approved

## Prompt 2

"Please use `prototype` explicitly for a logic/state prototype that explores the checkout flow, disabled states, and interaction logic without wiring it into production checkout."

Expected behavior:
- interpret this as an explicit `prototype` request for logic/state prototype exploration
- ask one prototype question and wait before artifacts to confirm the learning goal, disposal boundary, and judgment criteria
- model state transitions and flow behavior in a disposable artifact
- keep the state prototype separate from the real checkout implementation until sign-off

## Prompt 3

"Use `prototype` explicitly to clean up the throwaway admin-table run-view and write the outcome handoff: what was accepted, rejected, and still undecided."

Expected behavior:
- honor the explicit `prototype` request as cleanup for a disposable prototype artifact
- ask one prototype question and wait before artifacts to confirm the learning goal, disposal boundary, and judgment criteria
- capture the outcome handoff rather than expanding the prototype into production code
- name accepted, rejected, and undecided behavior for implementation handoff

## Prompt 4

"Use `prototype` explicitly, but first confirm the approval boundary for the reporting surface and stop if the team has not approved a disposable prototype yet."

Expected behavior:
- honor the explicit `prototype` request while checking the approval boundary before building
- ask one prototype question and wait before artifacts to confirm the learning goal, disposal boundary, and judgment criteria
- ask for approval or sign-off if the disposable prototype path is not yet authorized
- do not implement the reporting prototype until the approval boundary is clear

## Prompt 5

"Use `prototype` explicitly to review this request, but call it a non-trigger if it would mean implementation overreach or keeping production code as the prototype."

Expected behavior:
- honor the explicit `prototype` request as a boundary check rather than permission to overreach
- identify production implementation overreach as a non-trigger for disposable prototype work
- do not implement or keep production code under the label of a prototype
