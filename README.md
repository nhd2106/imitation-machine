# @duoc95/imitation-machine

Enterprise-oriented agentic SDLC framework with:

- Skill-driven workflow (brainstorm, plan, tdd, staged reviews)
- Expanded workflow inventory (`systematic-debugging`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, `receiving-code-review`)
- Hard gates (coverage/typecheck/security)
- Verification-before-completion (`agentic verify all`)
- Mono-repo impact tooling (`agentic repo *`)
- Audit trail and approvals
- Worktree lifecycle support
- Persona orchestration (`agentic orchestrate run --plan PLN-...`)

## OpenCode Install

### Local first (recommended while iterating)

Run:

```bash
./scripts/install-local-opencode.sh
```

This creates a local OpenCode package layout under `~/.config/opencode/imitation-machine/`, registers the plugin in `~/.config/opencode/plugins/`, and exposes the skills in `~/.config/opencode/skills/imitation-machine/`.

Restart OpenCode, then ask:

```text
use skill tool to list skills
```

### Package install

Add this plugin in your `opencode.json` only after the package is actually published or a real git URL is available:

```json
{
  "plugin": ["@duoc95/imitation-machine"]
}
```

Do not rely on the package name alone for local development.

## Claude Code Install

### Local first (recommended while iterating)

Run:

```bash
./scripts/install-local-claude-plugin.sh
```

This registers a local Claude Code development marketplace and installs `imitation-machine` as a real plugin.

If you want loose local skills in addition to the plugin, you can also run:

```bash
./scripts/install-local-claude.sh
```

Then start a new Claude Code session and ask:

```text
Use Skill tool to list available skills and then load using-agentic.
```

Expanded workflow examples to look for in the skill inventory: `systematic-debugging`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, and `receiving-code-review`.

See step-by-step local setup details in `CLAUDE_INSTALL.md`.

## OpenCode Session Verification

Use this command to verify plugin and skills are loaded in this project session:

```bash
opencode run --print-logs "use skill tool to list skills and load using-agentic"
```

In logs, confirm:

- plugin path `.opencode/plugins/imitation-machine.js` loaded
- `service=skill` initialized
- `using-agentic` listed and loadable

If skills do not appear, use the local install script above rather than the package name.

## CLI

```bash
agentic --help
agentic verify all
agentic worktree --help
agentic check-plugin --json
agentic orchestrate run --plan PLN-xxxx --dry-run
agentic orchestrate run --plan PLN-xxxx --max-parallel 3 --continue-on-error
agentic orchestrate status --plan PLN-xxxx --json
```
