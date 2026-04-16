# Code Quality Reviewer Prompt Template

Use this only after spec review passes.

```text
Review task [TASK_ID] for code quality.

Task text:
[PASTE FULL TASK TEXT HERE]

Implementation context:
- Files changed: [LIST]
- Verification command/result: [SUMMARY]

Check:
- Is the code readable and appropriately scoped?
- Are names clear and aligned with behavior?
- Is control flow simple enough to maintain?
- Is there avoidable duplication or leftover debug code?
- Does the implementation follow existing repo patterns?

Output format:
- Status: Approved | Issues Found
- Blocking issues:
  - [issue] - [why it matters]
- Advisory notes:
  - [optional improvement]
```
