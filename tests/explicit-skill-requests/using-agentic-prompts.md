# Explicit Using Agentic Requests

## Prompt 1

"Use the `using-agentic` skill explicitly before you touch anything else. We are in the repo workflow already, and I want the right bootstrap loaded first."

Expected behavior:
- immediately load `using-agentic`
- honor the explicit `using-agentic` request before doing narrower workflow work

## Prompt 2

"Start with the `using-agentic` skill explicitly. Do the repo workflow bootstrap first so we do not skip the opted-in process rules."

Expected behavior:
- interpret this as an explicit request for `using-agentic`
- keep the response inside the repo workflow bootstrap path first
