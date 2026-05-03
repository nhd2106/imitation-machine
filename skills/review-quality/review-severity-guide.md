# Review Severity Guide

- `CRITICAL`: security, data loss, or severe correctness risk
- `HIGH`: likely bug or serious maintenance problem
- `MEDIUM`: meaningful improvement worth fixing now
- `LOW`: minor cleanup or follow-up note

Use the lowest severity that still communicates the actual risk.

Every finding should explain why it matters. Severity is not a label for reviewer preference; it is a claim about the likely production, maintenance, testing, or readability cost of leaving the issue unresolved.

When reporting:

- name the file/location when possible
- describe the risk in concrete terms
- explain how to fix it if the change is not obvious
- avoid inflating style preferences into blocking issues
