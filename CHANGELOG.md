# Changelog

## [0.3.0] - 2026-06-01

### Features

- feat(codex): bootstrap controller-role injection via `.codex-plugin/AGENTS.md` and SessionStart hook — Codex now receives the same controller-role constraints as Claude Code and OpenCode (PR #76)
- feat(codex): `.codex-plugin/guards/pre-tool.sh` — `PreToolUse` guardrail blocking writes to `.git/`, `.codex-plugin/`, and `hooks/`, plus a prohibited dangerous-git command list (PR #77)
- feat(codex): `plugin.json` now declares `"agents": "./agents/"` and the installer copies all 12 personas so they are available inside Codex (PR #77)

### Fixes

- fix(dispatch): `im-po` (Product Owner persona) added as the first dispatch rule in the Claude Code bootstrap and OpenCode plugin — it was installed but never routed to (PR #75)
- fix(dispatch): `opencode.json` hardcoded path removed; file is now gitignored and generated at install time (PR #75)
- fix(codex): `install-local-codex.sh` extended to write `.codex/AGENTS.md`, `.codex/hooks.json`, and enable `codex_hooks`; `bin/im.mjs` ships `AGENTS.md` for npx installs (PR #76)

### Documentation

- docs: package description, README, and `plugin.json` reframed with governance-layer positioning; Codex promoted to first position in docs (PR #75)
- docs: `using-agentic/SKILL.md` Codex dispatch section added; full `@persona` list completed (PR #75, #76)
- docs: `AGENTS.md` extended with explicit dangerous-git prohibition list (PR #77)

## [0.2.0] - 2026-05-14

Initial public release on npm.
