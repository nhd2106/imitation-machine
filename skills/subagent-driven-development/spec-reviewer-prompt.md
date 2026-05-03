# Spec Reviewer Prompt Template

Use this after implementation and before quality review.

```text
Review task [TASK_ID] for spec compliance.

Task text:
[PASTE FULL TASK TEXT HERE]

Implementation context:
- Files changed: [LIST]
- Verification command/result: [SUMMARY]
- Implementer report: [PASTE REPORT]

Critical instruction: do not trust the report.

The implementer report may be incomplete, optimistic, or based on a misunderstanding. Verify independently from the task text and actual changed files before approving.

Do:
- Read the changed files or diff yourself
- Compare each requested behavior to the implementation
- Check for missing, partial, or extra behavior
- Check whether tests prove the requested behavior instead of implementation details

Do not:
- Accept the implementer's summary as proof
- Approve because the verification command passed if the code does not match the spec
- Treat quality preferences as spec failures unless they change requested behavior

Check:
- Does the implementation satisfy every requested behavior?
- Did it add unrequested behavior?
- Do tests verify the task rather than implementation details?

Output format:
- Status: Approved | Issues Found
- Blocking issues:
  - [file/location] [issue] - [why it violates the task]
- Advisory notes:
  - [optional improvement]
```
