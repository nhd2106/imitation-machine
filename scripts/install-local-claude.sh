#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
CLAUDE_AGENTS_DIR="${CLAUDE_AGENTS_DIR:-$HOME/.claude/agents}"

mkdir -p "$CLAUDE_SKILLS_DIR"
mkdir -p "$CLAUDE_AGENTS_DIR"

for skill_dir in "$REPO_ROOT"/skills/*; do
  [ -d "$skill_dir" ] || continue
  skill_name="$(basename "$skill_dir")"
  ln -sfn "$skill_dir" "$CLAUDE_SKILLS_DIR/$skill_name"
done

for agent_file in "$REPO_ROOT"/agents/*.md; do
  [ -f "$agent_file" ] || continue
  agent_name="$(basename "$agent_file" .md)"
  ln -sfn "$agent_file" "$CLAUDE_AGENTS_DIR/im-${agent_name}.md"
done

cat <<EOF
Installed Imitation Machine skills and agents for Claude Code locally.

Skills directory:
  $CLAUDE_SKILLS_DIR

Agents directory:
  $CLAUDE_AGENTS_DIR (prefixed as im-*)

Next steps:
1. Start a new Claude Code session.
2. Ask: Use Skill tool to list available skills.
3. Confirm skills like using-agentic, brainstorm, plan, tdd, verify appear.
4. In opted-in repos, the Agent tool can dispatch: im-coder, im-planner,
   im-reviewer-spec, im-reviewer-quality, im-reviewer-final, im-security, im-worktree.

Note: Agents are prefixed im- to avoid conflicts with any existing ~/.claude/agents/ files.
EOF
