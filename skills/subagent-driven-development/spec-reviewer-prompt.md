# Spec Reviewer Prompt Template

Use this after implementation and before quality review.

```text
Review task [TASK_ID] for spec compliance.

Task text:
[PASTE FULL TASK TEXT HERE]

Implementation context:
- Files changed: [LIST]
- Verification command/result: [SUMMARY]

Check:
- Does the implementation satisfy every requested behavior?
- Did it add unrequested behavior?
- Do tests verify the task rather than implementation details?

Output format:
- Status: Approved | Issues Found
- Blocking issues:
  - [issue] - [why it violates the task]
- Advisory notes:
  - [optional improvement]
```
