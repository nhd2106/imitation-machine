# OpenCode Harness Notes

Lightweight OpenCode harness coverage is split into:

- `scripts/opencode-harness.ts` for bounded command construction and transcript evaluation
- `tests/opencode-harness.test.ts` for focused unit coverage
- `tests/opencode-harness-smoke.test.ts` for fixture-backed bootstrap → process-skill → plan-ready progression

Run with:

```bash
bun run test:harness
```
