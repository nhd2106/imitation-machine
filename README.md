# @duoc95/imitation-machine

Enterprise-oriented agentic SDLC framework with:

- Skill-driven workflow (brainstorm, plan, tdd, staged reviews)
- Expanded workflow inventory (`systematic-debugging`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, `requesting-code-review`, `receiving-code-review`)
- Hard gates (coverage/typecheck/security)
- Verification-before-completion (`agentic verify all`)
- Mono-repo impact tooling (`agentic repo *`)
- Audit trail and approvals
- Worktree lifecycle support
- Persona orchestration (`agentic orchestrate run --plan PLN-...`)

## Current status

### Ships now

`imitation-machine` ships a broad workflow surface plus bounded behavioral evaluation for:

- workflow entry and execution (`using-agentic`, `plan`, `executing-plans`, `tdd`, `subagent-driven-development`)
- review and release flow (`requesting-code-review`, `receiving-code-review`, `review-spec`, `review-quality`, `review-security`, `pr`, `release`, `finishing-a-development-branch`)
- repo/workspace discipline (`repo`, `worktree`, `gate`, `verify`, `commit`, `adr`)
- debugging, design, and coordination (`systematic-debugging`, `design`, `dispatching-parallel-agents`)

- strong workflow breadth and review/release specialization
- bounded OpenCode and Claude harness coverage
- trigger, explicit-request, and multi-turn fixture coverage across the main workflow skills

### Remaining gaps

- broader behavioral evaluation depth beyond the bounded harness layer, especially denser integration-style and recovery-path scenarios

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

Expanded workflow examples to look for in the skill inventory: `systematic-debugging`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, `requesting-code-review`, and `receiving-code-review`.

See step-by-step local setup details in `CLAUDE_INSTALL.md`.

### Source repo / developer-only verification

The commands and paths below are for contributors working from this source repository. They rely on checked-in `tests/` and `scripts/` assets and are not part of the published package payload.

For fast bounded transcript/unit coverage across both surfaces in this repo checkout, run `bun run test:harness`.

For the reusable executable workflow regression lane in this repo checkout that scaffolds a temporary Bun repo, seeds an approved single-task plan, runs a real failing-test-to-passing-test flow, and validates transcript/review/verification evidence, run `bun run test:workflow-harness` or `bun scripts/executable-workflow-harness.ts`.

For OpenCode-only live bounded checks in this repo checkout that replay a checked-in manifest through `opencode run --print-logs`, including continued multi-turn scenarios that use `--continue`, run `bash tests/opencode/run-tests.sh live`. Set `OPENCODE_LIVE=1` to execute real sessions; otherwise the live harness skips cleanly.

For surface-specific commands, coverage details, and slower integration-oriented checks in the source repo, use the per-surface guides in `tests/opencode/README.md` and `tests/claude-code/README.md`.

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

The bounded OpenCode transcript harness, including the env-gated live runner, is documented in `tests/opencode/README.md`.

## CLI

```bash
agentic --help
agentic mode show
agentic mode lite
agentic mode standard
agentic mode strict
agentic mode clear
agentic verify all
agentic worktree --help
agentic worktree cleanup-merged --json
agentic check-plugin --json
agentic orchestrate run --plan PLN-xxxx --dry-run
agentic orchestrate run --plan PLN-xxxx --max-parallel 3 --continue-on-error
agentic orchestrate status --plan PLN-xxxx --json
```

## Project mode resolution

`imitation-machine` resolves policy mode in this order:

1. per-project override set with `agentic mode lite|standard|strict`
2. repo default from `.imitation-machine.json`
3. fallback `standard`

Repo defaults live in the repo:

```json
{
  "mode": "standard"
}
```

Per-project overrides are stored outside the repo, keyed by project path, and remain in effect until `agentic mode clear`.

The OpenCode bootstrap now prints the resolved mode and whether it came from `override`, `repo-config`, or `fallback`.

Mode semantics in v1:

- `lite`: relaxes the pre-workflow guard after bootstrap; bash and file writes are allowed without an implementation workflow skill
- `standard`: current default behavior; bash allowed after bootstrap, writes still require a workflow skill
- `strict`: requires a workflow skill before bash or file writes

## Harness verification

This section documents source-repo/developer-only harness assets.

For fast bounded coverage plus surface-specific and integration-oriented guidance in this repo checkout, use `tests/opencode/README.md` and `tests/claude-code/README.md`.

The source repo also includes a checked-in live scenario manifest at `tests/opencode/live-scenarios.json` and a bounded live runner at `scripts/opencode-live-harness.ts`.
