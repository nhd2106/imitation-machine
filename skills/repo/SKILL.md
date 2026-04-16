---
name: repo
description: Use when working in a monorepo and you need to understand dependency impact, identify affected packages, or run scoped test and build operations safely
---

# Repo

Use repo-aware commands when the codebase has workspace relationships that make full-repo guesses too expensive or too noisy.

## When To Use

- monorepo impact analysis
- affected-package discovery
- scoped test or build runs
- dependency graph inspection before refactors

## Workflow

```dot
digraph repo_flow {
  "Need monorepo context" [shape=doublecircle];
  "Choose comparison SHA or branch base" [shape=box];
  "Inspect affected packages or graph" [shape=box];
  "Run scoped tests/builds if appropriate" [shape=box];
  "Need broader verification?" [shape=diamond];
  "Run full verification" [shape=box];

  "Need monorepo context" -> "Choose comparison SHA or branch base";
  "Choose comparison SHA or branch base" -> "Inspect affected packages or graph";
  "Inspect affected packages or graph" -> "Run scoped tests/builds if appropriate";
  "Run scoped tests/builds if appropriate" -> "Need broader verification?";
  "Need broader verification?" -> "Run full verification" [label="yes"];
}
```

## Common Commands

```sh
agentic repo graph
agentic repo affected --since <sha>
agentic repo test --since <sha>
agentic repo build --since <sha>
```

## Rules

- choose the correct comparison point before trusting affected results
- inspect affected packages before assuming scoped runs are enough
- use full verification when the impact is broad or the graph is uncertain
- do not guess monorepo blast radius from filenames alone

## Red Flags

Stop if:

- you do not know the correct merge base or comparison SHA
- the workspace graph looks incomplete or surprising
- scoped results are being used to avoid broader verification without justification
- you are assuming transitive impact without checking the graph

## Companion Files

- `references/monorepo-assumptions.md`
- `impact-checklist.md`

## Runtime Agent

- In OpenCode, prefer `@planner` when repo graph analysis is driving task decomposition or scoped execution planning.
