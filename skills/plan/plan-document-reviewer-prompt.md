# Plan Document Reviewer Prompt Template

Use this after a plan is written and before it is approved.

```text
Review this implementation plan for execution readiness.

Plan file: [PATH]

Check:
- every task has exact file paths
- every task has a runnable verification command
- expected outputs are concrete
- no placeholder language remains
- tasks are small enough to complete in 2-5 minutes
- task order respects dependencies

Output:
- Status: Approved | Issues Found
- Blocking issues:
  - [task/section]: [issue] - [why it blocks execution]
- Advisory notes:
  - [optional improvement]
```
