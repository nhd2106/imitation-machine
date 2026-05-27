---
name: codemap
description: Use when an agent needs a navigational map of the codebase before exploring, when CODEMAP.md does not exist yet and should be created, or when the map is stale after significant changes
---

# Codemap

## Overview

Grepping through an unfamiliar codebase is expensive and lossy. A `CODEMAP.md` at the repo root gives every agent a single file to read first: what the project does, what each module owns, where to start for common tasks, and what the domain vocabulary means.

**Core principle:** Read `CODEMAP.md` first. Grep second. Create it when it doesn't exist. Keep it honest when it drifts.

## read-first Protocol

**Before any codebase exploration in an IM-enabled repo:**

1. Check if `CODEMAP.md` exists: `ls CODEMAP.md 2>/dev/null`
2. If it exists → read it before opening any source file or running any grep
3. If it doesn't exist → run the Create flow below, then proceed

This saves 10–50 tool calls per session on medium-to-large codebases.

## Create

Run when `CODEMAP.md` does not exist.

**Step 1 — Scan structure**

```sh
# Top-level shape
ls -1
# Package/workspace config
cat package.json 2>/dev/null || cat Cargo.toml 2>/dev/null || cat pyproject.toml 2>/dev/null
# Entry points
find . -name "main.*" -o -name "index.*" -o -name "app.*" | grep -v node_modules | grep -v dist | head -20
```

**Step 2 — Read key files**

Read `README.md` (or `README`) and any existing `CONTEXT.md`. Do not read source files yet — infer from directory names and the README.

**Step 3 — Generate CODEMAP.md**

Copy `codemap-template.md` and fill every section. Rules:

- **Module Map**: one row per top-level directory or package that contains logic (skip `node_modules`, `dist`, `.git`, lock files). One-line description of what it owns. Key files: 1–3 most important files per module, not an exhaustive list.
- **Entry Points**: answer "if I need to do X, where do I start?" for the 3–5 most common tasks in this repo.
- **Domain Language**: terms specific to this project that a fresh agent would not know. One sentence each. Borrow from `CONTEXT.md` if it exists. No generic programming terms.
- **Key Patterns**: recurring implementation patterns (e.g. "all DB queries go through `db/query.ts`", "config is always read from env via `config.ts`"). 3–7 entries.

**Step 4 — Wire into CLAUDE.md**

Add `@CODEMAP.md` to the repo's `CLAUDE.md` (create it if missing). This auto-includes the map in every Claude Code session — with or without the IM plugin.

```markdown
# If CLAUDE.md already exists, append:
@CODEMAP.md

# If CLAUDE.md does not exist, create it with:
@CODEMAP.md
```

**Step 5 — Commit**

```sh
git add CODEMAP.md CLAUDE.md && git commit -m "docs: add CODEMAP.md for agent navigation"
```

## Update

Run when `CODEMAP.md` exists but the codebase has drifted.

**When to update:**

- After adding a new module or package
- After a significant refactor that moves responsibilities
- When a domain term is renamed or a pattern changes
- When `zoom-out` or `architecture-deepening` reveals the map is wrong

**How:**

```sh
git diff main...HEAD --stat        # what changed
git log --oneline -10              # recent commits for context
```

Read only the sections affected by the diff. Update those rows. Do not rewrite the whole file unless the structure changed fundamentally. Commit: `git commit -m "docs: update CODEMAP.md — <what changed>"`

## Integration With Other Skills

- **`zoom-out`** — reads `CODEMAP.md` first if available; updates stale sections after orientation
- **`plan`** — references module map when declaring allowed files per task
- **`subagent-driven-development`** — controller reads module map before dispatching implementers; includes relevant rows in each task brief
- **`session-handoff`** — include CODEMAP.md path in `.wip.md` Open Questions if map needs updating

## What NOT to Put in CODEMAP.md

- Implementation details (how a function works internally)
- Specs or requirements (those belong in PRDs or plan files)
- Generic programming concepts (HTTP, REST, async — not project-specific)
- Exhaustive file lists (keep to 1–3 key files per module)
- Historical notes ("we used to use X") — that's ADR territory

## Red Flags

Stop if you catch yourself: skipping `CODEMAP.md` and grepping instead when the file exists, adding implementation details to the map instead of structural facts, making the Module Map so long it becomes a file index, or leaving `CODEMAP.md` stale for more than one significant refactor cycle.

## Companion Files

- `codemap-template.md`
