#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS_DIR="${CODEX_AGENTS_DIR:-$HOME/.agents}"
SKILLS_DIR="$AGENTS_DIR/skills"

mkdir -p "$SKILLS_DIR"
ln -sfn "$REPO_ROOT/skills" "$SKILLS_DIR/imitation-machine"

cat <<EOF
Installed Imitation Machine skills for Codex.

Skills symlink:
  $SKILLS_DIR/imitation-machine

This is a supported local install surface for Codex.
It remains a skills-only setup with no plugin integration, no bootstrap injection,
and no live Codex harness claim.

Next steps:
1. Restart Codex if it is already running.
2. In a new session, use the skill tool to list skills.
3. Confirm using-agentic and other imitation-machine skills appear.
EOF
