# Multi-Turn Workflow: Persona Orchestration

## Turn 1

User: "We want to add audit export support for admins. Help me clarify the requirement first."

Expected behavior:
- use `@po` to clarify requirement and acceptance criteria

## Turn 2

User: "The requirement is approved. Now design the module boundary and write the implementation plan."

Expected behavior:
- use `@architect` if boundary decisions are needed
- use `@planner` to decompose work

## Turn 3

User: "Execute the first task and review it properly."

Expected behavior:
- use `@coder`
- then `@reviewer-spec`
- then `@reviewer-quality`

## Turn 4

User: "Before I open the PR, make sure security and release readiness are covered too."

Expected behavior:
- use `@security`
- use `@release`
