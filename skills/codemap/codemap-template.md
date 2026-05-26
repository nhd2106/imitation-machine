# Codebase Map

> One sentence: what does this project do and who uses it?

## Domain Language

<!-- Terms specific to this project. One sentence each. No generic programming concepts. -->

**Term**: Definition. _Avoid_: synonym1, synonym2

## Module Map

<!-- One row per top-level directory/package that contains logic. Skip node_modules, dist, .git. -->

| Path | Owns | Key files |
|---|---|---|
| `src/` | <!-- what this owns --> | `index.ts`, `app.ts` |

## Entry Points

<!-- Answer "if I need to do X, start at Y" for the 3–5 most common tasks. -->

| Task | Start here |
|---|---|
| Add a new API endpoint | `src/routes/` |
| Change business logic | `src/domain/` |
| Fix a failing test | `src/` + test file named after the module |

## Key Patterns

<!-- Recurring implementation conventions a fresh agent must know. 3–7 entries. -->

- **Config**: all config read from env via `src/config.ts` — never inline `process.env`
- **DB access**: all queries go through `src/db/query.ts`, never raw SQL elsewhere
- **Error handling**: throw domain errors (`DomainError`), catch at API boundary only

## Last Updated

<!-- YYYY-MM-DD — update when a module changes ownership or a pattern changes -->
