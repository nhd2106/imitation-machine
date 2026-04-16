#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKETPLACE_NAME="imitation-machine-dev"
PLUGIN_NAME="imitation-machine"

claude plugin marketplace add "$REPO_ROOT"
claude plugin install "$PLUGIN_NAME@$MARKETPLACE_NAME"

cat <<EOF
Installed Imitation Machine as a Claude Code plugin.

Marketplace:
  $MARKETPLACE_NAME

Plugin:
  $PLUGIN_NAME@$MARKETPLACE_NAME

Next steps:
1. Start a new Claude Code session.
2. Run: claude plugin list
3. Confirm imitation-machine appears as an installed plugin.
EOF
