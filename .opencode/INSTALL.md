# OpenCode install

## Recommended path

For local development from this source repository, prefer the packaged local install command.

From this source checkout, use `./bin/agentic` unless `agentic` is already on your `PATH`.

```bash
./bin/agentic install local --surface opencode
```

## Manual fallback

If you need the raw script directly, use this manual fallback:

```bash
./scripts/install-local-opencode.sh
```

This packaged local install from this repo creates:

- `~/.config/opencode/imitation-machine/.opencode/plugins/imitation-machine.js` -> local package plugin file
- `~/.config/opencode/plugins/imitation-machine.js` -> registered plugin symlink OpenCode reads
- `~/.config/opencode/skills/imitation-machine` -> local skills symlink

The package-root layout matters because the plugin resolves its bundled skills via a relative path.

## Dangerous git guardrails

The OpenCode plugin dangerous git guardrails apply only to OpenCode plugin behavior, not Claude or Codex. The guardrail blocks high-risk/destructive git commands such as hard reset, force clean, force branch delete, checkout/restore all paths, and force push; normal git inspection (`git status`, `git diff`, `git log`) and non-force push/PR flows remain available under the usual bash permission/policy prompts. This is not a complete shell sandbox and not a replacement for human review.

Restart OpenCode after running either path.

## Published registry install (not recommended for local development)

Use this only after the package is actually published and reachable.

Add this to `opencode.json`:

```json
{
  "plugin": ["@duoc95/imitation-machine"]
}
```

Restart OpenCode.

## Verify

In OpenCode chat, ask:

```text
Use Skill tool to list available skills and then load using-agentic.
```

Expected:

- `using-agentic`
- `gate`
- `verify`
- `worktree`
- `repo`
- `using-agentic` loads successfully

If the skills do not appear, first re-run:

```bash
./bin/agentic install local --surface opencode
```

If that still fails, inspect these paths and then restart OpenCode:

- `~/.config/opencode/plugins/imitation-machine.js`
- `~/.config/opencode/skills/imitation-machine`
