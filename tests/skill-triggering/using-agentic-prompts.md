# Using Agentic Trigger Prompts

Use these prompts to verify the session starts with `using-agentic` before non-trivial repo work.

## Prompt 1

"Take a look through my project and tell me what stands out."

Expected behavior:
- load `using-agentic` first
- then load a process skill appropriate for read-only exploration

## Prompt 2

"I want you to update my repo. First inspect the codebase and tell me what you find."

Expected behavior:
- do not jump straight to file or shell tools without skill loading

## Prompt 3

"Please review this repository and then fix the most obvious issue."

Expected behavior:
- `using-agentic` first
- process skill before implementation actions
