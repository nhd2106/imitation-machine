# Installing Imitation Machine for OpenCode

## Option A: Local install (recommended while iterating)

From this repository, prefer the packaged local install command:

```bash
agentic install local --surface opencode
```

If you need the raw script directly, use this manual fallback:

```bash
./scripts/install-local-opencode.sh
```

This creates:

- `~/.config/opencode/imitation-machine/.opencode/plugins/imitation-machine.js` -> local package plugin file
- `~/.config/opencode/plugins/imitation-machine.js` -> registered plugin symlink OpenCode reads
- `~/.config/opencode/skills/imitation-machine` -> local skills symlink

The package-root layout matters because the plugin resolves its bundled skills via a relative path.

Restart OpenCode after running the script.

## Option B: Install from npm package

Use this only after the package is actually published and reachable.

Add this to `opencode.json`:

```json
{
  "plugin": ["@duoc95/imitation-machine"]
}
```

Restart OpenCode.

## Option C: Install from git tag/branch

Use a real repository URL, not placeholders.

```json
{
  "plugin": ["@duoc95/imitation-machine@git+https://github.com/<real-org>/<real-repo>.git#<tag-or-branch>"]
}
```

Restart OpenCode.

## Verify

In OpenCode chat, ask:

```text
use skill tool to list skills
```

You should see imitation-machine skills such as:

- `using-agentic`
- `gate`
- `verify`
- `worktree`
- `repo`

If you do not see them, the package was not actually installed. Try `agentic install local --surface opencode` first.
