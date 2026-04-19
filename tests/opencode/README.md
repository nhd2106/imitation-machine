# OpenCode Harness Notes

OpenCode harness coverage is split between a fast bounded check and broader integration-oriented usage.

## Fast bounded coverage

This path stays local, deterministic, and intentionally narrow:

- `scripts/opencode-harness.ts` for bounded command construction and transcript evaluation
- `tests/opencode-harness.test.ts` for focused unit coverage
- `tests/opencode-harness-smoke.test.ts` for fixture-backed happy-path and failure-path progression checks
- `tests/opencode/run-tests.sh fast` to run only the OpenCode-focused bounded tests

Run either:

```bash
bash tests/opencode/run-tests.sh fast
```

or:

```bash
bun test tests/opencode-harness.test.ts tests/opencode-harness-smoke.test.ts
```

## Integration-oriented usage

Use a real OpenCode session when you need to confirm plugin installation, live skill loading, or end-to-end routing behavior:

```bash
opencode run --print-logs "use skill tool to list skills and load using-agentic"
```

That path is slower and environment-dependent, so keep it separate from the fast bounded harness checks. The fast runner is meant to protect bounded transcript behavior, not to replace real-session validation.

## Live bounded harness

The live harness stays OpenCode-only and reuses the existing bounded transcript semantics from `scripts/opencode-harness.ts`.

- `tests/opencode/live-scenarios.json` defines the checked-in live scenarios
- `scripts/opencode-live-harness.ts` loads the manifest, runs `opencode run --print-logs`, and evaluates the returned transcript text
- `tests/opencode-live-harness.test.ts` covers manifest loading, env gating, command construction, and transcript evaluation wiring

By default, live mode skips cleanly unless `OPENCODE_LIVE=1` is set:

```bash
bash tests/opencode/run-tests.sh live
```

To execute real OpenCode scenarios:

```bash
OPENCODE_LIVE=1 bash tests/opencode/run-tests.sh live
```

This keeps `fast` deterministic while making the slower OpenCode session checks discoverable without adding Claude live automation here.
