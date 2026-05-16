# Explicit Requirements Brief Requests

## Prompt 1

"Use `requirements-brief` explicitly to turn the current context into a PRD-like requirements brief before anyone plans implementation."

Expected behavior:
- load `requirements-brief`
- honor the explicit `requirements-brief` request as read-only requirements synthesis
- include problem, users, goals, non-goals, and acceptance criteria/test notes

## Prompt 2

"Please use `requirements-brief` explicitly without another interview; inspect the existing docs first and ask only about blocking ambiguity."

Expected behavior:
- interpret this as an explicit `requirements-brief` request
- inspect existing repo/docs/context before asking questions
- preserve the no-new-interviewing boundary except for blocking ambiguity

## Prompt 3

"Use `requirements-brief` explicitly to capture out-of-scope items and recommend whether the next step is `issue-slicing`, `plan`, or `@po`."

Expected behavior:
- load `requirements-brief`
- honor the explicit out-of-scope capture and read-only boundary
- recommend `issue-slicing`, `plan`, or `@po` instead of implementing
