# Requirements Brief Trigger Prompts

Use these prompts to verify current-context requirements synthesis routes to `requirements-brief` without interviewing, planning, or implementation.

## Prompt 1

"Turn the current context and repo notes into a PRD-style requirements brief before we move into issue-slicing or planning."

Expected behavior:
- load `requirements-brief`
- synthesize the current context into a PRD or requirements brief before planning or issue-slicing
- keep the result read-only and avoid implementation planning

## Prompt 2

"Create a requirements synthesis from the existing context without another interview; only ask if there is blocked ambiguity that the repo docs cannot answer."

Expected behavior:
- load `requirements-brief`
- inspect existing repo docs and context before asking questions
- avoid no-new-interviewing violations by asking only for blocking ambiguity

## Prompt 3

"Summarize goals, non-goals, out-of-scope boundaries, acceptance criteria, and test notes, then recommend whether the next handoff should be issue-slicing or plan."

Expected behavior:
- load `requirements-brief`
- capture out-of-scope boundaries plus acceptance criteria/test notes
- recommend the next skill handoff to `issue-slicing`, `plan`, or `@po`
