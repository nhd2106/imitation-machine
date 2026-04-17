---
name: dispatching-parallel-agents
description: Use when multiple independent checks or research threads can run safely in parallel without hidden ordering or shared-state risks
---

# Dispatching Parallel Agents

## Overview

Parallelism is only useful when tasks are genuinely independent. Split work so each runtime agent has a narrow goal, a clear boundary, and no write conflict.

## Workflow

1. Confirm the work can be parallelized with `references/parallel-safety-checklist.md`.
2. Define one outcome per runtime agent.
3. Use `dispatch-template.md` so every agent gets scope, inputs, and output format.
4. Launch agents only after shared-state risks are removed.
5. Merge results after all agents finish, then resolve any contradictions centrally.

## Red Flags

- Parallelizing tasks that write the same files
- Dispatching before the dependency order is clear
- Giving agents overlapping ownership
- Treating speed as more important than coordination safety

## Companion Files

- `references/parallel-safety-checklist.md`
- `dispatch-template.md`
