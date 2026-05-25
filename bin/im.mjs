#!/usr/bin/env node
/**
 * Imitation Machine installer
 *
 * Usage:
 *   npx @duoc95/imitation-machine [surface]
 *   npx @duoc95/imitation-machine --surface <claude|opencode|codex|all>
 *   npx @duoc95/imitation-machine --help
 *
 * surface: claude | opencode | codex | all (default: all)
 */
import { cp, mkdir, readdir, readFile, writeFile, symlink, unlink, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, "..");
const HOME = homedir();
const INSTALL_DIR = join(HOME, ".imitation-machine");

const HELP = `
imitation-machine installer

Usage:
  npx @duoc95/imitation-machine [surface]
  npx @duoc95/imitation-machine --surface <surface>

Surfaces:
  claude    Install into Claude Code   (~/.claude/plugins/)
  opencode  Install into OpenCode      (~/.config/opencode/plugins/)
  codex     Install into Codex         (~/plugins/imitation-machine/)
  all       Install all surfaces (default)

Examples:
  npx @duoc95/imitation-machine
  npx @duoc95/imitation-machine claude
  npx @duoc95/imitation-machine --surface opencode
`.trim();

// ── helpers ──────────────────────────────────────────────────────────────────

function ok(msg) { console.log(`  ✓ ${msg}`); }
function info(msg) { console.log(`  ${msg}`); }
function warn(msg) { console.log(`  ⚠  ${msg}`); }

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function tryExec(cmd, args) {
  try {
    execFileSync(cmd, args, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function copyPackageToInstallDir() {
  info(`Syncing package to ${INSTALL_DIR} ...`);
  await cp(PKG_ROOT, INSTALL_DIR, {
    recursive: true,
    force: true,
    filter: (src) => {
      const rel = src.slice(PKG_ROOT.length);
      if (rel.startsWith("/node_modules") || rel.startsWith("/.git")) return false;
      return true;
    },
  });
  ok(`Package synced → ${INSTALL_DIR}`);
}

// ── surface installers ────────────────────────────────────────────────────────

async function installClaude() {
  console.log("\n── Claude Code ──────────────────────────────────────────────");

  // Preferred path: use the official claude CLI
  const viaPlugin =
    (await tryExec("claude", ["plugin", "marketplace", "add", INSTALL_DIR])) &&
    (await tryExec("claude", ["plugin", "install", "imitation-machine@imitation-machine-dev"]));

  if (viaPlugin) {
    ok("Installed via claude plugin CLI (hooks + bootstrap active).");
    info("Restart Claude Code and open a repo that has .imitation-machine-enabled.");
    return;
  }

  warn("claude CLI not found — falling back to manual skills install.");

  // Fallback: copy each skill into ~/.claude/skills/
  const claudeSkillsDir = join(HOME, ".claude", "skills");
  await mkdir(claudeSkillsDir, { recursive: true });

  const skillsDir = join(INSTALL_DIR, "skills");
  for (const skill of await readdir(skillsDir)) {
    await cp(join(skillsDir, skill), join(claudeSkillsDir, skill), {
      recursive: true,
      force: true,
    });
  }
  ok(`Skills copied → ${claudeSkillsDir}`);
  warn("Bootstrap hook is NOT active. To enable it, install the claude CLI and re-run:");
  info("  npx @duoc95/imitation-machine claude");
}

async function installOpenCode() {
  console.log("\n── OpenCode ─────────────────────────────────────────────────");

  const pluginsDir = join(HOME, ".config", "opencode", "plugins");
  await mkdir(pluginsDir, { recursive: true });

  const pluginSrc = join(INSTALL_DIR, ".opencode", "plugins", "imitation-machine.js");
  const pluginDst = join(pluginsDir, "imitation-machine.js");

  // Replace any stale symlink or file
  if (await exists(pluginDst)) await unlink(pluginDst);
  await symlink(pluginSrc, pluginDst);

  ok(`Plugin symlinked → ${pluginDst}`);
  info("Restart OpenCode to activate.");
  info("Skills are at: " + join(INSTALL_DIR, "skills"));
}

async function installCodex() {
  console.log("\n── Codex ────────────────────────────────────────────────────");

  const pluginDst = join(HOME, "plugins", "imitation-machine");
  await mkdir(join(pluginDst, ".codex-plugin"), { recursive: true });

  await cp(
    join(INSTALL_DIR, ".codex-plugin", "plugin.json"),
    join(pluginDst, ".codex-plugin", "plugin.json"),
    { force: true },
  );
  await cp(join(INSTALL_DIR, "skills"), join(pluginDst, "skills"), {
    recursive: true,
    force: true,
  });
  ok(`Plugin files copied → ${pluginDst}`);

  // Update ~/.agents/plugins/marketplace.json
  const marketplacePath = join(HOME, ".agents", "plugins", "marketplace.json");
  await mkdir(dirname(marketplacePath), { recursive: true });

  let marketplace = {};
  if (existsSync(marketplacePath)) {
    try {
      marketplace = JSON.parse(await readFile(marketplacePath, "utf8"));
    } catch {
      warn("marketplace.json exists but could not be parsed — overwriting.");
    }
  }

  const existingPlugins = Array.isArray(marketplace.plugins)
    ? marketplace.plugins.filter((p) => p?.name !== "imitation-machine")
    : [];

  marketplace = {
    name: typeof marketplace.name === "string" && marketplace.name ? marketplace.name : "local-repo",
    interface: { displayName: "Local Repo", ...(marketplace.interface ?? {}) },
    ...marketplace,
    plugins: [
      ...existingPlugins,
      {
        name: "imitation-machine",
        source: { source: "local", path: "./plugins/imitation-machine" },
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
        category: "Development",
      },
    ],
  };

  await writeFile(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n");
  ok(`Marketplace updated → ${marketplacePath}`);
  info("Restart Codex to activate.");
}

// ── main ──────────────────────────────────────────────────────────────────────

const SURFACES = { claude: installClaude, opencode: installOpenCode, codex: installCodex };

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  // Accept positional arg or --surface flag
  const surfaceFlag = args.find((a) => a.startsWith("--surface="))?.split("=")[1];
  const surfaceFlagNext = args.indexOf("--surface") !== -1 ? args[args.indexOf("--surface") + 1] : undefined;
  const positional = args.find((a) => !a.startsWith("-"));
  const surfaceArg = surfaceFlag ?? surfaceFlagNext ?? positional ?? "all";

  const valid = [...Object.keys(SURFACES), "all"];
  if (!valid.includes(surfaceArg)) {
    console.error(`Unknown surface: "${surfaceArg}". Valid: ${valid.join(", ")}`);
    process.exit(1);
  }

  const targets = surfaceArg === "all" ? Object.keys(SURFACES) : [surfaceArg];

  console.log(`\nImitation Machine — installing for: ${targets.join(", ")}`);
  console.log("─".repeat(60));

  await copyPackageToInstallDir();

  for (const surface of targets) {
    await SURFACES[surface]();
  }

  console.log("\n" + "─".repeat(60));
  console.log("Done. Add .imitation-machine-enabled to any repo to opt in.\n");
}

main().catch((err) => {
  console.error("\nInstall failed:", err.message);
  process.exit(1);
});
