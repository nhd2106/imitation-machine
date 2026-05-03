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
- Confirm the worktree/path, allowed files, expected behavior, and verification command

While working:
- Implement only the requested behavior
- Keep changes within the declared files unless you need to escalate
- Run the verification command before reporting back
- Follow the file structure and boundaries from the plan
- Keep each file focused on one clear responsibility
- Do not restructure existing code outside the task, even if you notice cleanup opportunities

Stop and escalate when:
- Requirements, acceptance criteria, or architecture are unclear
- You are unsure whether your approach is correct
- The task requires unplanned restructuring or changes outside allowed files
- A new or changed file is growing beyond the plan's intent
- You are reading more and more files without gaining clarity
- Verification cannot be run or does not prove the requested behavior

How to escalate:
- Report `NEEDS_CONTEXT` if a question must be answered before work continues
- Report `BLOCKED` if scope, architecture, or plan changes are required
- State what you tried, what is unclear, and what help is needed
- Never silently produce work you are unsure about

Before reporting back, self-review:
- Did I implement the full task?
- Did I add anything not requested?
- Are names and structure clear?
- Do tests verify behavior?
- Do tests verify real behavior, not mock behavior?
- Did I avoid YAGNI and unplanned cleanup?

Report format:
- Status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
- What changed
- Verification run and result
- Files changed
- Concerns or open questions
```
