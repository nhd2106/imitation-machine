#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_DIR="${OPENCODE_CONFIG_DIR:-$HOME/.config/opencode}"
PLUGINS_DIR="$CONFIG_DIR/plugins"
SKILLS_DIR="$CONFIG_DIR/skills"
PACKAGE_DIR="$CONFIG_DIR/imitation-machine"

mkdir -p "$PLUGINS_DIR" "$SKILLS_DIR" "$PACKAGE_DIR/.opencode/plugins"

# Mirror the package-root layout OpenCode expects so ../../skills resolves correctly
ln -sfn "$REPO_ROOT/skills" "$PACKAGE_DIR/skills"
ln -sfn "$REPO_ROOT/.opencode/plugins/imitation-machine.js" "$PACKAGE_DIR/.opencode/plugins/imitation-machine.js"

# Register the plugin via the top-level plugins directory OpenCode scans
ln -sfn "$PACKAGE_DIR/.opencode/plugins/imitation-machine.js" "$PLUGINS_DIR/imitation-machine.js"

# Also expose the skills as a plain local skill bundle for visibility/debugging
ln -sfn "$REPO_ROOT/skills" "$SKILLS_DIR/imitation-machine"

cat <<EOF
Installed Imitation Machine for OpenCode locally.

Plugin symlink:
  $PLUGINS_DIR/imitation-machine.js

Package root:
  $PACKAGE_DIR

Skills symlink:
  $SKILLS_DIR/imitation-machine

Next steps:
1. Restart OpenCode.
2. In chat, ask: use skill tool to list skills
3. Confirm skills like using-agentic, plan, tdd, verify appear.
EOF
