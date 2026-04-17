# Multi-Turn Workflow: Using Agentic To Plan

## Turn 1

User: "We opted into the workflow. Help me figure out the right process for a messy feature request."

Expected behavior:
- load `using-agentic` first
- choose a discovery-oriented process skill instead of planning immediately

## Turn 2

User: "The goal is an audit dashboard, but I still need help narrowing scope and constraints."

Expected behavior:
- keep the session in clarification mode until the request is shaped enough to plan
- avoid implementation actions while discovery is still incomplete

## Turn 3

User: "Okay, the scope is approved now. Write the implementation plan."

Expected behavior:
- transition from workflow bootstrap/discovery into `plan`
- produce executable tasks once the request is sufficiently defined
