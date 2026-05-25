---
name: install
description: Use when the user wants to install Imitation Machine, set it up globally, enable it for a specific project, or check what is already installed
---

# Install

Guide the user through installing Imitation Machine — globally (once, for all projects) and/or opting a specific project in.

## Two-Layer Model

```
Layer 1 — Global install (once per machine)
  npx @duoc95/imitation-machine
  → copies plugin to ~/.imitation-machine/
  → registers with Claude Code / OpenCode / Codex

Layer 2 — Project opt-in (once per repo)
  touch .imitation-machine-enabled
  → activates the bootstrap hook in that repo
  → the workflow is now live for that project
```

Both layers are required for the full workflow. Layer 1 alone means the skills are available globally but no repo is opted in. Layer 2 alone in a repo where Layer 1 was never run means no bootstrap hook fires.

## Step 1 — Detect Current State

Before asking anything, check:

```bash
# Is Layer 1 done?
ls ~/.imitation-machine/skills/using-agentic 2>/dev/null && echo "GLOBAL: installed" || echo "GLOBAL: not installed"

# Is Layer 2 done for this repo?
[ -f .imitation-machine-enabled ] && echo "PROJECT: opted in" || echo "PROJECT: not opted in"
```

Report what you find, then ask one question:

> "I can see [state]. Do you want to:
> A) Install globally and opt this project in (recommended — full setup)
> B) Install globally only (you'll opt in projects individually later)
> C) Opt this project in only (assumes global install is already done)
> D) Just check what's installed"

Wait for the answer before proceeding.

## Path A — Full Setup (recommended)

Run once, sets up everything:

```bash
# 1. Install globally for all supported surfaces
npx @duoc95/imitation-machine

# 2. Opt this project in
touch .imitation-machine-enabled
```

Verify:

```bash
ls ~/.imitation-machine/skills/using-agentic   # global install OK
cat .imitation-machine-enabled                  # project opt-in OK
```

Start a new session. The bootstrap hook will inject the `using-agentic` context automatically.

## Path B — Global Install Only

```bash
npx @duoc95/imitation-machine
```

Specific surface flags:

```bash
npx @duoc95/imitation-machine claude    # Claude Code only
npx @duoc95/imitation-machine opencode  # OpenCode only
npx @duoc95/imitation-machine codex     # Codex only
```

To opt a project in later, run `touch .imitation-machine-enabled` in that project's root.

## Path C — Project Opt-In Only

Assumes `~/.imitation-machine/` already exists from a previous global install.

```bash
touch .imitation-machine-enabled
```

Then start a new session. Verify the bootstrap fires by checking that the agent receives the `using-agentic` context at session start.

If the bootstrap does NOT fire, the global install is missing. Run Path A instead.

## Path D — Check What Is Installed

```bash
# Global install
ls ~/.imitation-machine/ 2>/dev/null || echo "not installed"

# Claude Code plugin
claude plugin list 2>/dev/null | grep imitation-machine || echo "not registered"

# OpenCode plugin
ls ~/.config/opencode/plugins/imitation-machine.js 2>/dev/null || echo "not registered"

# Codex plugin
cat ~/plugins/imitation-machine/.codex-plugin/plugin.json 2>/dev/null || echo "not registered"

# Project opt-in
[ -f .imitation-machine-enabled ] && echo "this project: opted in" || echo "this project: not opted in"
```

Report findings and suggest next steps.

## Updating an Existing Install

Re-run the global install to update:

```bash
npx @duoc95/imitation-machine
```

This overwrites `~/.imitation-machine/` with the latest version. No project opt-in changes needed — `.imitation-machine-enabled` files stay in place.

## Opting a Project Out

```bash
rm .imitation-machine-enabled
```

The plugin remains globally installed. Other opted-in projects are unaffected.

## Uninstalling Globally

```bash
rm -rf ~/.imitation-machine

# Remove Claude Code plugin
claude plugin uninstall imitation-machine 2>/dev/null
claude plugin marketplace remove imitation-machine-dev 2>/dev/null

# Remove OpenCode plugin symlink
rm -f ~/.config/opencode/plugins/imitation-machine.js

# Remove Codex plugin
rm -rf ~/plugins/imitation-machine
```

## Red Flags

- "The skill isn't loading" → check Layer 1 first (`ls ~/.imitation-machine/skills/`)
- "The bootstrap isn't firing" → check Layer 2 first (`cat .imitation-machine-enabled`)
- "Skills load but hooks don't fire" → Claude plugin is not registered; re-run `npx @duoc95/imitation-machine claude`
- "I updated the package but nothing changed" → re-run `npx @duoc95/imitation-machine` to sync `~/.imitation-machine/`
