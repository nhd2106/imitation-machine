# Implementer Prompt Template

Use this when dispatching the worker for one task.

```text
You are implementing task [TASK_ID]: [TASK_TITLE]

Task text:
[PASTE FULL TASK TEXT HERE]

Context:
- Where this task fits in the plan
- Dependencies already completed
- Files in scope
- Verification command

Before you begin:
- Ask questions now if requirements, constraints, or scope are unclear
- Do not guess
- Follow the tdd skill if implementation is required

While working:
- Implement only the requested behavior
- Keep changes within the declared files unless you need to escalate
- Run the verification command before reporting back

Before reporting back, self-review:
- Did I implement the full task?
- Did I add anything not requested?
- Are names and structure clear?
- Do tests verify behavior?

Report format:
- Status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
- What changed
- Verification run and result
- Files changed
- Concerns or open questions
```
