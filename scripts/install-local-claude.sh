#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"

mkdir -p "$CLAUDE_SKILLS_DIR"

for skill_dir in "$REPO_ROOT"/skills/*; do
  [ -d "$skill_dir" ] || continue
  skill_name="$(basename "$skill_dir")"
  ln -sfn "$skill_dir" "$CLAUDE_SKILLS_DIR/$skill_name"
done

cat <<EOF
Installed Imitation Machine skills for Claude Code locally.

Skills directory:
  $CLAUDE_SKILLS_DIR

Next steps:
1. Start a new Claude Code session.
2. Ask: Use Skill tool to list available skills.
3. Confirm skills like using-agentic, brainstorm, plan, tdd, verify appear.

Note: Claude Code local development typically discovers skills from ~/.claude/skills.
EOF
