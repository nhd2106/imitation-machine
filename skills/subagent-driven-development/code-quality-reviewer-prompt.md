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
- Does each changed file have one clear responsibility and a usable boundary?
- Are tests meaningful, maintainable, and focused on real behavior?
- Did the change introduce unnecessary abstractions, overbroad files, or YAGNI features?

Severity guidance:
- Critical: security, data loss, severe correctness, or severe maintainability risk
- High: likely bug or substantial maintenance problem
- Medium: issue worth fixing now before handoff
- Low: advisory cleanup or follow-up note; place under Advisory notes, not Must-fix findings

For each issue, include file/location, why it matters, and how to fix if not obvious.

Output format:
- Status: Approved | Issues Found
- Strengths:
  - [specific thing done well]
- Must-fix findings:
  - [Critical|High|Medium] [file/location] [issue] - [why it matters]
- Advisory notes:
  - [Low] [file/location] [optional improvement or follow-up note]
- Assessment:
  - Ready to proceed? Yes | No | With fixes
```
