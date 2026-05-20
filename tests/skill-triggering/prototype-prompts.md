# Prototype Trigger Prompts

Use these prompts to verify approved throwaway prototype requests route to `prototype` while ambiguous discovery and production implementation requests stay with the appropriate skill.

## Prompt 1

"The product direction is approved. Build a quick UI prototype for the onboarding welcome screen so we can compare two visual prototype treatments before choosing the final experience."

Expected behavior:
- load `prototype` because the UI prototype has an approved direction and an explicit approval boundary
- ask one prototype question and wait before artifacts to confirm the learning goal, disposal boundary, and judgment criteria
- create a disposable screen prototype or run-view that makes the experience variation easy to compare
- avoid production hardening and hand off the selected direction before implementation starts

## Prompt 2

"We approved the checkout behavior experiment. Make a logic/state prototype that models the cart flow, disabled states, and interaction logic without wiring it into the real checkout path."

Expected behavior:
- load `prototype` for the approved logic/state prototype rather than jumping to production code
- ask one prototype question and wait before artifacts to confirm the learning goal, disposal boundary, and judgment criteria
- keep the state prototype focused on flow behavior, model transitions, and observable interaction logic
- keep it disposable and separate from the real checkout implementation until the team signs off

## Prompt 3

"Create a disposable artifact for the admin-table idea: I want a run-view that lets us click through sorting, empty states, and the rejected-row path before implementation handoff."

Expected behavior:
- load `prototype` because the requested output is a disposable artifact with a run-view expectation
- ask one prototype question and wait before artifacts to confirm the learning goal, disposal boundary, and judgment criteria
- keep the prototype boundary clear so reviewers can validate behavior without treating it as production implementation
- record what needs approval before implementation handoff instead of polishing production details

## Prompt 4

"Should we prototype the new reporting surface, or do we need to understand the workflow more first? I'm not approving a build yet."

Expected behavior:
- treat this as an approval boundary question, not an approved `prototype` trigger
- route to `zoom-out` or `brainstorm` for read-only discovery and decision framing before implementation
- do not implement a prototype until the user gives clear approval for a disposable prototype path

## Prompt 5

"Skip TDD and build it directly in production code as a prototype; if it works, we can keep the implementation and clean it up later."

Expected behavior:
- treat this as a non-trigger for `prototype` because it asks for production code and a TDD shortcut
- do not load `prototype` to justify implementation overreach or bypass test-first discipline
- stay with the appropriate implementation or `tdd` routing and require proper proof before changing production code
