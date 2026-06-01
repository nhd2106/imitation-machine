#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS_DIR="${CODEX_AGENTS_DIR:-$HOME/.agents}"
PLUGIN_ROOT="$HOME/plugins/imitation-machine"
PLUGIN_PARENT="$(dirname "$PLUGIN_ROOT")"
MARKETPLACE_DIR="$AGENTS_DIR/plugins"
MARKETPLACE_PATH="$AGENTS_DIR/plugins/marketplace.json"

mkdir -p "$PLUGIN_PARENT" "$MARKETPLACE_DIR"
STAGED_PLUGIN_ROOT="$(mktemp -d "$PLUGIN_PARENT/imitation-machine.staging.XXXXXX")"
STAGED_MARKETPLACE_PATH="$(mktemp "$MARKETPLACE_DIR/marketplace.json.staging.XXXXXX")"
cleanup() {
  if [ -n "${STAGED_PLUGIN_ROOT:-}" ] && [ -e "$STAGED_PLUGIN_ROOT" ]; then
    rm -rf "$STAGED_PLUGIN_ROOT"
  fi
  if [ -n "${STAGED_MARKETPLACE_PATH:-}" ] && [ -e "$STAGED_MARKETPLACE_PATH" ]; then
    rm -f "$STAGED_MARKETPLACE_PATH"
  fi
}
trap cleanup EXIT

mkdir -p "$STAGED_PLUGIN_ROOT/.codex-plugin"
cp "$REPO_ROOT/.codex-plugin/plugin.json" "$STAGED_PLUGIN_ROOT/.codex-plugin/plugin.json"
cp "$REPO_ROOT/.codex-plugin/AGENTS.md" "$STAGED_PLUGIN_ROOT/.codex-plugin/AGENTS.md"
cp -R "$REPO_ROOT/skills" "$STAGED_PLUGIN_ROOT/skills"

MARKETPLACE_PATH="$MARKETPLACE_PATH" STAGED_MARKETPLACE_PATH="$STAGED_MARKETPLACE_PATH" bun -e '
const marketplacePath = process.env.MARKETPLACE_PATH;
const stagedMarketplacePath = process.env.STAGED_MARKETPLACE_PATH;
if (!marketplacePath || !stagedMarketplacePath) {
  throw new Error("MARKETPLACE_PATH and STAGED_MARKETPLACE_PATH are required");
}

const requiredEntry = {
  name: "imitation-machine",
  source: {
    source: "local",
    path: "./plugins/imitation-machine",
  },
  policy: {
    installation: "AVAILABLE",
    authentication: "ON_INSTALL",
  },
  category: "Development",
};
const requiredMarketplace = {
  name: "local-repo",
  interface: {
    displayName: "Local Repo",
  },
};

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

let marketplace = {};
const file = Bun.file(marketplacePath);
if (await file.exists()) {
  const raw = await file.text();
  try {
    marketplace = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`marketplace.json is not valid JSON: ${message}`);
    process.exit(1);
  }

  if (!isObject(marketplace)) {
    console.error("marketplace.json must contain a JSON object root to merge local plugins safely");
    process.exit(1);
  }

  if ("name" in marketplace && typeof marketplace.name !== "string") {
    console.error("marketplace.json name must be a string to merge local plugins safely");
    process.exit(1);
  }

  if ("interface" in marketplace && !isObject(marketplace.interface)) {
    console.error("marketplace.json interface must be an object to merge local plugins safely");
    process.exit(1);
  }

  if ("plugins" in marketplace && !Array.isArray(marketplace.plugins)) {
    console.error("marketplace.json plugins must be an array to merge local plugins safely");
    process.exit(1);
  }
}

const existingPlugins = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
const preservedPlugins = [];
let existingEntry = undefined;

for (const plugin of existingPlugins) {
  if (isObject(plugin) && plugin.name === "imitation-machine") {
    if (existingEntry === undefined) {
      existingEntry = plugin;
    }
    continue;
  }
  preservedPlugins.push(plugin);
}

const existingSource = isObject(existingEntry?.source) ? existingEntry.source : {};
const existingPolicy = isObject(existingEntry?.policy) ? existingEntry.policy : {};
const updatedEntry = {
  ...(isObject(existingEntry) ? existingEntry : {}),
  name: requiredEntry.name,
  source: {
    ...existingSource,
    ...requiredEntry.source,
  },
  policy: {
    ...existingPolicy,
    ...requiredEntry.policy,
  },
  category: requiredEntry.category,
};
const existingInterface = isObject(marketplace.interface) ? marketplace.interface : {};
const updatedMarketplace = {
  ...marketplace,
  name: typeof marketplace.name === "string" && marketplace.name.trim().length > 0
    ? marketplace.name
    : requiredMarketplace.name,
  interface: {
    ...requiredMarketplace.interface,
    ...existingInterface,
  },
  plugins: [...preservedPlugins, updatedEntry],
};

await Bun.write(
  stagedMarketplacePath,
  `${JSON.stringify(updatedMarketplace, null, 2)}\n`,
);
'

rm -rf "$PLUGIN_ROOT"
mv "$STAGED_PLUGIN_ROOT" "$PLUGIN_ROOT"
STAGED_PLUGIN_ROOT=""

mv "$STAGED_MARKETPLACE_PATH" "$MARKETPLACE_PATH"
STAGED_MARKETPLACE_PATH=""

# Write Codex bootstrap files into the current working directory (opted-in project).
mkdir -p ".codex"
cp "$REPO_ROOT/.codex-plugin/AGENTS.md" ".codex/AGENTS.md"
cp "$REPO_ROOT/.codex-plugin/hooks.json" ".codex/hooks.json"

# Idempotently append codex_hooks feature flag to .codex/config.toml.
if [ ! -f ".codex/config.toml" ] || ! grep -q "codex_hooks" ".codex/config.toml"; then
  printf '\n[features]\ncodex_hooks = true\n' >> ".codex/config.toml"
fi

cat <<EOF
Installed Imitation Machine as a Codex local plugin.

Plugin root:
  $PLUGIN_ROOT

Manifest:
  $PLUGIN_ROOT/.codex-plugin/plugin.json

Skills directory:
  $PLUGIN_ROOT/skills

Marketplace:
  $MARKETPLACE_PATH

Bootstrap:
  AGENTS.md and SessionStart hook installed → .codex/AGENTS.md, .codex/hooks.json

This is a supported packaged local install surface for Codex.
It installs a local plugin package with no \`mcpServers\`, no apps,
no agents support, and no live Codex harness claim.

Next steps:
1. Restart Codex if it is already running.
2. In a new session, confirm the local plugin is available.
3. Use the skill tool to confirm using-agentic and other imitation-machine skills appear.
EOF
