# Commit Message Template

```text
type(scope): short imperative summary

[optional body explaining why]

Requirement-Id: REQ-xxx
Plan-Id: PLN-xxx
Task-Id: TSK-xxx
```

## Hook-Aware Usage Notes

- if a hook rewrites files, restage them and retry the commit with the same intended message
- do not use a no-bypass shortcut when the hook fails; fix the issue first
- if the earlier commit was already pushed, keep pushed history stable and create a follow-up commit instead of amend
