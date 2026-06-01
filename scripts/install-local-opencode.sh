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

# Generate .opencode/opencode.json with the correct local absolute path.
# OpenCode's plugin field requires a file:// URI; relative paths are not supported.
# This file is gitignored to prevent hardcoded absolute paths from being committed.
OPENCODE_JSON="$REPO_ROOT/.opencode/opencode.json"
PLUGIN_PATH="file://$REPO_ROOT/.opencode/plugins/imitation-machine.js"
python3 -c "
import json, sys
path = '$OPENCODE_JSON'
try:
    with open(path) as f:
        cfg = json.load(f)
except Exception:
    cfg = {}
cfg.setdefault('\$schema', 'https://opencode.ai/config.json')
cfg['plugin'] = ['$PLUGIN_PATH']
with open(path, 'w') as f:
    json.dump(cfg, f, indent=2)
    f.write('\n')
"

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
