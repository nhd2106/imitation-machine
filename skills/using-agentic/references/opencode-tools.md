# OpenCode Tool Mapping

Use this reference when a skill mentions tool names abstractly and you need the OpenCode equivalent.

| Skill concept | OpenCode tool |
|---|---|
| Skill loading | `skill` |
| Task tracking | `todowrite` |
| Subagent dispatch | `task` |
| File reads | `read` |
| File search | `glob` |
| Content search | `grep` |
| Command execution | `bash` |
| Web fetch | `webfetch` |
| File editing | `apply_patch` |

## Notes

- Prefer `multi_tool_use.parallel` when tool calls are independent
- Use `apply_patch` for manual edits
- Use `bun`-first commands in this repo
