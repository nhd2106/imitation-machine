# Spec Document Reviewer Prompt Template

Use this template when reviewing a brainstormed requirement or design note before planning.

```text
Task / review prompt:

You are reviewing a requirement or design document for planning readiness.

Document to review: [PATH]

What to check:
- Completeness: no TODOs, TBDs, or missing sections that block planning
- Consistency: no contradictions between scope, behavior, and acceptance criteria
- Clarity: no ambiguity likely to make two engineers build different things
- Scope: focused enough for one implementation plan
- Restraint: no obvious unrequested work or speculative scope

Calibration:
- Flag only issues that would create a bad plan or bad implementation handoff
- Do not block on style preferences or minor wording improvements

Output format:
- Status: Approved | Issues Found
- Blocking issues:
  - [section]: [issue] - [why it matters]
- Advisory recommendations:
  - [optional improvement]
```
