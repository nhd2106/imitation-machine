# Codebase Map

Enterprise agentic SDLC plugin and CLI (`agentic`). Packages skills, gates, agents, audit trail, and installer surfaces for OpenCode, Claude Code, and Codex workflows.

## Domain Language

**Skill**: A markdown document loaded into an agent's context via the `Skill` tool to govern how it approaches a task. Lives in `skills/<name>/SKILL.md`.

**Gate**: A hard quality check (`coverage`, `typecheck`, `spec`, `quality`, `security`, `plan`) that blocks completion when it fails. Lives in `gates/`.

**Persona / Agent**: A role-scoped subagent (coder, planner, reviewer-spec, etc.) defined in `agents/*.md`. Installed as `im-*` in Claude Code; invoked as `@persona` in OpenCode.

**Plan**: A structured work breakdown (`PLN-*`) stored in `.agentic/plans/`. Created by `agentic plan new`, approved before execution.

**Requirement**: An intake artifact (`REQ-*`) in `.agentic/requirements/` that traces to a plan.

**Mode**: Workflow strictness level (`lite` / `standard` / `strict`) stored in `.agentic/mode`. Controls which gates are mandatory.

**Worktree**: An isolated git working tree for a branch. IM creates them under `.worktrees/feat/<name>/` and owns cleanup.

**Opted-in repo**: A repo with `.imitation-machine-enabled` at root. The bootstrap hook only activates in opted-in repos.

## Module Map

| Path | Owns | Key files |
|---|---|---|
| `bin/` | CLI entry points | `agentic` (shell dispatch), `im.mjs` (npx installer) |
| `cli/` | All `agentic` subcommand logic | `index.ts` (routing + help), `commands/*.ts` (one file per command) |
| `gates/` | Gate implementations | `coverage.ts`, `typecheck.ts`, `spec.ts`, `quality.ts`, `security-sast.ts`, `security-secrets.ts`, `plan.ts`, `persist.ts`, `types.ts` |
| `agents/` | Persona agent definitions (OpenCode + Claude Code) | `coder.md`, `planner.md`, `reviewer-spec.md`, `reviewer-quality.md`, `reviewer-final.md`, `security.md`, `worktree.md` |
| `skills/` | All SDLC workflow skills (35+) | `using-agentic/SKILL.md` (entrypoint), `plan/`, `tdd/`, `verify/`, `subagent-driven-development/` |
| `audit/` | Agent run audit trail (SQLite) | `trail.ts` (start/complete/fail runs), `approvals.ts` |
| `db/` | SQLite client and schema | `client.ts`, `schema.ts`, `migrate.ts` |
| `monorepo/` | Affected-package detection | `graph.ts`, `affected.ts`, `runner.ts` |
| `hooks/` | Git hooks (pre-commit, pre-push) | `pre-commit`, `pre-push` |
| `.claude-plugin/` | Claude Code plugin manifest and bootstrap | `plugin.json`, `hooks/bootstrap.sh`, `hooks/hooks.json` |
| `.opencode/` | OpenCode plugin entry point | `plugins/imitation-machine.js` |
| `scripts/` | Local install helpers | `install-local-claude.sh`, `install-local-opencode.sh`, `install-local-codex.sh` |
| `tests/` | All test files | `skills.test.ts` (skill content), `gates.test.ts`, `skill-packages.test.ts`, `claude-plugin.test.ts` |

## Entry Points

| Task | Start here |
|---|---|
| Add a new skill | Create `skills/<name>/SKILL.md` using `skills/writing-skills/SKILL.md` as guide; add tests in `tests/skills.test.ts` |
| Add a new gate | Add `gates/<name>.ts` implementing `GateResult`; wire into `cli/commands/gate.ts` |
| Add a new CLI subcommand | Add `cli/commands/<name>.ts`; register in `cli/index.ts` routing |
| Change install behavior | Edit `bin/im.mjs` (npx path) and `scripts/install-local-*.sh` (local dev path) |
| Change session bootstrap | Edit `.claude-plugin/hooks/bootstrap.sh` |
| Add a new agent persona | Add `agents/<name>.md`; update `bin/im.mjs` and `scripts/install-local-claude.sh` to copy as `im-<name>.md` |
| Debug a failing test | `bun test tests/<file>.test.ts` — test names are descriptive; read the failing expect message |
| Understand gate flow | Read `cli/commands/gate.ts` → `gates/<name>.ts` → `gates/persist.ts` |

## Key Patterns

- **Gate result persistence**: all gate runs write to `.agentic/gates/` via `gates/persist.ts` — never write directly from gate implementations
- **Skill tests are content-anchored**: `tests/skills.test.ts` checks for specific strings in SKILL.md files — adding a skill without tests means it has no quality contract
- **Worktrees under `.worktrees/feat/`**: IM-owned worktrees live here; worktrees elsewhere are treated as externally managed and never cleaned up automatically
- **`im-` agent prefix**: IM agents installed to `~/.claude/agents/` use `im-` prefix to avoid clobbering existing user agents
- **Bootstrap controller role**: the SessionStart hook (`bootstrap.sh`) fires in opted-in repos and injects a strict **controller role** — the main assistant is prohibited from implementing, reading source files, or calling the Skill tool; every task must be dispatched to an `im-*` agent via the Agent tool
- **Plan approval gate**: `gates/plan.ts` blocks execution unless the plan has an approval record in `audit/approvals.ts`
- **`agentic verify all`** = typecheck + gate coverage + gate security + bun test — the canonical "is this ready?" command before any completion claim

## Last Updated

2026-05-27
