# Worktree Checklist

- create a dedicated branch per requirement or plan
- avoid direct implementation on main/master
- select directory by priority: `.worktrees/`, then `worktrees/`, then repo instructions, then ask
- verify project-local worktree directories with `git check-ignore`
- run `bun install` when `package.json` is present and dependencies need setup
- run a baseline verification command before implementation
- report path, branch, setup command, and baseline result
- remove stale worktrees after merge
- verify no uncommitted work is being discarded before removal
