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

## Quickstart

If you are trying this for the first time from a local checkout of this repository, start here.

From this source checkout, use `./bin/agentic` unless you already installed `agentic` on your `PATH`.

1. Install local dependencies first: `bun install`
2. If you are contributing from this checkout, read [CONTRIBUTING.md](CONTRIBUTING.md) for the full repo-local setup and verification flow.
3. Choose exactly one install target based on the client you use. Here, **surface** means the client or tool you are installing into, such as OpenCode or Claude.
   - OpenCode: `./bin/agentic install local --surface opencode`
   - Claude: `./bin/agentic install local --surface claude`
   - Codex: `./bin/agentic install local --surface codex` (supported local install surface; skills-only, no plugin integration)
4. Check the current workflow mode: `./bin/agentic mode show`
5. Run the final verification gate: `./bin/agentic verify all`

- `./bin/agentic mode show` tells you how strict the repo is configured to be.
- `./bin/agentic verify all` is the final "do the checks say this is ready?" command.

### Tiny example workflow

```text
1. Open a repo that opted into imitation-machine.
2. Load `using-agentic`.
3. Pick the process skill that matches the task (for example `plan` or `tdd`).
4. Do the work with the right personas and review steps.
5. Run `./bin/agentic verify all` before calling it done.
```

## Contributing

Contributors working from this repo checkout should start with [CONTRIBUTING.md](CONTRIBUTING.md) for Bun setup, bounded change expectations, staged review order, and local verification commands. Pull requests in this repo also use the checked-in [pull request template](.github/PULL_REQUEST_TEMPLATE.md).

## 2-minute mental model

`using-agentic` is the entry skill. It does not do the work itself. It tells the agent, "this repo opted into the workflow, so load the right process skill before you start making changes."

In plain language:

- `using-agentic` appears first when a repo wants the full workflow discipline.
- **Skills**: reusable workflow or policy packages such as `using-agentic`, `plan`, `tdd`, and `verify`.
- **Personas**: roles or subagents used during execution and review, such as a planner, coder, or reviewer.
- **Planner persona**: appears when the task needs a plan or clearer execution steps.
- **Coder persona**: appears when a bounded implementation task is ready to be done.
- **Reviewer personas**: appear after implementation to check spec fit, quality, and sometimes security.
- **`verify` skill**: appears at the end to gather fresh evidence before anyone says the work is complete.

Modes are just how much guardrail you want:

- **lite**: the most relaxed; useful when you want lighter workflow enforcement
- **standard**: the normal default; some workflow discipline, but not the strictest path
- **strict**: the most locked down; load the right workflow skill before doing real work

The core idea is simple: start with `using-agentic`, let the matching workflow skill drive the task, and finish with verification.

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

## Install

Published package assets include the `agentic` launcher, local install helper scripts, packaged plugin assets, and the `skills/` tree.

Use this table as the single install hub:

| Client | Recommended path | Manual fallback | Exact instructions | Support status / notes |
| --- | --- | --- | --- | --- |
| OpenCode | `./bin/agentic install local --surface opencode` | `./scripts/install-local-opencode.sh` | [`.opencode/INSTALL.md`](.opencode/INSTALL.md) | Supported packaged local install from this repo via plugin + skills. |
| Claude | `./bin/agentic install local --surface claude` | `./scripts/install-local-claude-plugin.sh` | [`CLAUDE_INSTALL.md`](CLAUDE_INSTALL.md) | Supported packaged local install from this repo via Claude development marketplace. |
| Codex | `./bin/agentic install local --surface codex` | `./scripts/install-local-codex.sh` | [`CODEX_INSTALL.md`](CODEX_INSTALL.md) | Supported local install surface; skills-only, no plugin integration, no bootstrap injection, no live Codex harness claim. |
| Cursor | Not currently supported | None | See notes in this table | No packaged installer or verified install flow in this repo today. |
| Gemini | Not currently supported | None | See notes in this table | No packaged installer or verified install flow in this repo today. |

If the CLI is already on your `PATH`, the equivalent install commands are `agentic install local --surface opencode`, `agentic install local --surface claude`, and `agentic install local --surface codex`.

For OpenCode, the packaged local install from this repo creates a local package layout under `~/.config/opencode/imitation-machine/`, registers the plugin in `~/.config/opencode/plugins/`, and exposes the skills in `~/.config/opencode/skills/imitation-machine/`.

For Claude, the packaged local install from this repo registers a local Claude Code development marketplace and installs `imitation-machine` as a real plugin. If you also want loose local skills while iterating, `CLAUDE_INSTALL.md` includes the optional `./scripts/install-local-claude.sh` step.

For Codex, the supported local install surface currently symlinks this repo's `skills/` tree into `~/.agents/skills/imitation-machine/`. It is intentionally skills-only: no plugin integration, no bootstrap injection, and no live Codex harness claim.

`./bin/agentic install local` and `./bin/agentic install local --surface all` now install OpenCode, Claude, and Codex in that stable order.

Published registry install guidance, when available for a surface, is documented separately from the packaged local install flow above.

Do not rely on the package name alone for local development.

### Source repo / developer-only verification

Repo-only contributor assets include checked-in `tests/`, harness scripts, and other verification helpers used from a source checkout.

The commands and paths below are for contributors working from this source repository checkout.

For fast bounded transcript/unit coverage across both surfaces in this repo checkout, run `bun run test:harness`.

For the reusable executable workflow regression lane in this repo checkout that scaffolds a temporary Bun repo, seeds an approved single-task plan, runs a real failing-test-to-passing-test flow, and validates transcript/review/verification evidence, run `bun run test:workflow-harness` or `bun scripts/executable-workflow-harness.ts`.

For OpenCode-only live bounded checks in this repo checkout that replay a checked-in manifest through `opencode run --print-logs`, including continued multi-turn scenarios that use `--continue`, run `bash tests/opencode/run-tests.sh live`. Set `OPENCODE_LIVE=1` to execute real sessions; otherwise the live harness skips cleanly.

For the opt-in installed OpenCode integration lane in this repo checkout that scaffolds a `docs-review` temp repo and runs a bounded multi-turn `opencode run --print-logs` / `opencode run --print-logs --continue` session, run `bun run test:opencode:installed` (or `bash tests/opencode/run-tests.sh installed`). Set `OPENCODE_INSTALLED_LIVE=1` to execute the real session; otherwise it skips cleanly.

For the opt-in installed Claude integration lane in this repo checkout that scaffolds a `docs-review` temp repo and runs a bounded multi-turn `claude --print` / `claude --print --continue` session, run `bash tests/claude-code/run-tests.sh installed`. Set `CLAUDE_INSTALLED_LIVE=1` to execute the real session; otherwise it skips cleanly.

For focused Codex installer verification in this repo checkout, run `bun run test:codex`. That lane executes the real installer against a temp `CODEX_AGENTS_DIR` and asserts `skills/imitation-machine` points at this repo's `skills/` tree. Details and current Codex limits live in `tests/codex/README.md`.

For surface-specific commands, coverage details, and slower integration-oriented checks in the source repo, use the per-surface guides in `tests/opencode/README.md`, `tests/claude-code/README.md`, and `tests/codex/README.md`.

## OpenCode verification

### Installed-user verification

After running the packaged local install from this repo, verify in an OpenCode session:

```bash
opencode run --print-logs "use skill tool to list skills and load using-agentic"
```

In logs, confirm:

- plugin path `~/.config/opencode/plugins/imitation-machine.js` loaded
- `service=skill` initialized
- `using-agentic` listed and loadable
- other imitation-machine skills such as `gate`, `verify`, `worktree`, and `repo` appear

If skills do not appear, first re-run `./bin/agentic install local --surface opencode`. If that still fails, inspect `~/.config/opencode/plugins/imitation-machine.js` and `~/.config/opencode/skills/imitation-machine`, then restart OpenCode.

### Repo-checkout / plugin-development verification

The commands below are source-checkout verification helpers for contributors working in this repository. They are not end-user package install steps.

The bounded OpenCode transcript harness, including the env-gated live runner, is documented in `tests/opencode/README.md`.

## CLI

```bash
./bin/agentic install local
./bin/agentic install local --surface all --dry-run
./bin/agentic install local --surface opencode
./bin/agentic install local --surface claude
./bin/agentic install local --surface codex
./bin/agentic --help
./bin/agentic mode show
./bin/agentic mode lite
./bin/agentic mode standard
./bin/agentic mode strict
./bin/agentic mode clear
./bin/agentic verify all
./bin/agentic worktree --help
./bin/agentic worktree cleanup-merged --json
./bin/agentic check-plugin --json
./bin/agentic orchestrate run --plan PLN-xxxx --dry-run
./bin/agentic orchestrate run --plan PLN-xxxx --max-parallel 3 --continue-on-error
./bin/agentic orchestrate status --plan PLN-xxxx --json
```

## Project mode resolution

`imitation-machine` resolves policy mode in this order:

1. per-project override set with `./bin/agentic mode lite|standard|strict`
2. repo default from `.imitation-machine.json`
3. fallback `standard`

Repo defaults live in the repo:

```json
{
  "mode": "standard"
}
```

Per-project overrides are stored outside the repo, keyed by project path, and remain in effect until `./bin/agentic mode clear`.

The OpenCode bootstrap now prints the resolved mode and whether it came from `override`, `repo-config`, or `fallback`.

Small flow example:

```bash
./bin/agentic mode show
./bin/agentic mode strict
./bin/agentic mode show
./bin/agentic mode clear
./bin/agentic mode show
```

Mode semantics in v1:

- `lite`: relaxes the pre-workflow guard after bootstrap; bash and file writes are allowed without an implementation workflow skill
- `standard`: current default behavior; bash allowed after bootstrap, writes still require a workflow skill
- `strict`: requires a workflow skill before bash or file writes

## Harness verification

This section documents source-repo/developer-only harness assets.

For fast bounded coverage plus surface-specific and integration-oriented guidance in this repo checkout, use `tests/opencode/README.md` and `tests/claude-code/README.md`.

The source repo also includes a checked-in live scenario manifest at `tests/opencode/live-scenarios.json` and a bounded live runner at `scripts/opencode-live-harness.ts`.
