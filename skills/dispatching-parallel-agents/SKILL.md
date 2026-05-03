---
name: dispatching-parallel-agents
description: Use when multiple independent checks or research threads can run safely in parallel without hidden ordering or shared-state risks
---

# Dispatching Parallel Agents

## Overview

Parallelism is only useful when tasks are genuinely independent. Split work so each runtime agent has a narrow goal, a clear boundary, and no write conflict.

Core principle: one agent per independent problem domain. If two tasks need the same files, state, or sequencing decision, they are not independent enough for shared-write parallel work.

## Workflow

1. Confirm the work can be parallelized with `references/parallel-safety-checklist.md`.
2. Define one outcome per runtime agent.
3. Use `dispatch-template.md` so every agent gets scope, inputs, and output format.
4. Launch agents only after shared-state risks are removed.
5. Check returned results for overlapping writes, contradictory conclusions, and missing evidence.
6. Merge results after all agents finish, then resolve any contradictions centrally.
7. Run final integration verification after results are combined.

## Focused Prompt Structure

Each parallel prompt should include:

- the single independent problem domain owned by that agent
- exact files, inputs, and constraints
- forbidden overlap with other agents
- verification or evidence expected from that agent
- expected output that lets the controller integrate safely

## Red Flags

- Parallelizing tasks that write the same files
- Dispatching before the dependency order is clear
- Giving agents overlapping ownership
- Treating speed as more important than coordination safety
- Combining parallel results without checking for conflicts
- Skipping final verification after integration

## Companion Files

- `references/parallel-safety-checklist.md`
- `dispatch-template.md`
