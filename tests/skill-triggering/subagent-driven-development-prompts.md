# Subagent-Driven Development Trigger Prompts

Use these prompts to verify multi-task approved work triggers `subagent-driven-development`.

## Prompt 1

"Execute approved plan PLN-123 task by task with separate reviewers."

Expected behavior:
- load `subagent-driven-development`
- use implementer -> spec review -> quality review order

## Prompt 2

"Dispatch fresh workers for each task in this plan and keep strict review gates."

Expected behavior:
- choose the subagent workflow rather than ad hoc execution
