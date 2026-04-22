# OpenCode Harness Notes

OpenCode harness coverage is split between a fast bounded check and broader integration-oriented usage.

## Fast bounded coverage

This path stays local, deterministic, and intentionally narrow:

- `scripts/opencode-harness.ts` for bounded command construction and transcript evaluation
- `tests/opencode-harness.test.ts` for focused unit coverage, including carried-forward continuation transcripts
- `tests/opencode-harness-smoke.test.ts` for fixture-backed happy-path and failure-path progression checks, including recovery issues for missing bootstrap markers, wrong process skill loads, stale verification evidence lines, contradictory agent status lines, and continued-session carry-forward regressions
- `tests/opencode/run-tests.sh fast` to run only the OpenCode-focused bounded tests

Run either:

```bash
bash tests/opencode/run-tests.sh fast
```

or:

```bash
bun test tests/opencode-harness.test.ts tests/opencode-harness-smoke.test.ts
```

The installed OpenCode lane is separate from this fast command set. Run it with `bun run test:opencode:installed` (or `bash tests/opencode/run-tests.sh installed`).

## Integration-oriented usage

Before running live or integration-oriented checks from this repo checkout, follow [`.opencode/INSTALL.md`](../../.opencode/INSTALL.md) so the local OpenCode plugin install is in place.

Use a real OpenCode session when you need to confirm plugin installation, live skill loading, or end-to-end routing behavior:

```bash
opencode run --print-logs "use skill tool to list skills and load using-agentic"
```

If you are validating mode resolution, set a repo default in `.imitation-machine.json` or use `./bin/agentic mode lite|standard|strict`, then confirm the bootstrap text reports the resolved mode and source (`override`, `repo-config`, or `fallback`).

That path is slower and environment-dependent, so keep it separate from the fast bounded harness checks. The fast runner is meant to protect bounded transcript behavior, not to replace real-session validation.

## Live bounded harness

The live harness stays OpenCode-only and reuses the existing bounded transcript semantics from `scripts/opencode-harness.ts`.

  - `tests/opencode/live-scenarios.json` defines the checked-in live scenarios, including optional per-scenario raw transcript substring checks for onboarding guidance
 - `scripts/opencode-live-harness.ts` loads the manifest, runs `opencode run --print-logs`, and can continue a prior scenario turn with `--continue`
 - `tests/opencode-live-harness.test.ts` covers manifest loading, env gating, command construction, continuation sequencing, and transcript evaluation wiring

The checked-in live manifest now exercises onboarding guidance plus the happy path and recovery realism cases:

- `fresh-install-flow`
- `first-run-help-flow`
- `mode-discovery-flow`
- `mode-confusion-recovery`
- `bootstrap-plan-ready`
- `missing-process-skill`
- `missing-bootstrap`
- `wrong-process-skill`
- `stale-verification-evidence`
- `contradictory-agent-outputs`
- `continuation-happy-path`
- `continuation-stale-verification`

The four onboarding scenarios specifically assert that the raw OpenCode transcript still includes user-facing guidance for:

- local OpenCode install, mode check, and final verification
- first-run workflow orientation (`using-agentic`, then a matching process skill)
- mode discovery output and source reporting
- mode precedence/reset recovery instructions

The recovery fixtures intentionally preserve the transcript lines that explain each failure so evaluator output stays actionable:

- missing bootstrap reports which bootstrap markers never appeared
- stale verification reports the stale `[verify] evidence ...` lines verbatim
- contradictory outputs report the conflicting `[agent:...] status: ...` lines verbatim
- continuation fixtures verify that a later turn can stay valid from carried-forward session context and still fail when stale verification evidence is carried into that continued turn

By default, live mode skips cleanly unless `OPENCODE_LIVE=1` is set:

```bash
bash tests/opencode/run-tests.sh live
```

To execute real OpenCode scenarios:

```bash
OPENCODE_LIVE=1 bash tests/opencode/run-tests.sh live
```

This keeps `fast` deterministic while making the slower OpenCode session checks discoverable without adding Claude live automation here.

## Installed OpenCode integration lane

This opt-in lane runs one bounded installed OpenCode long-running happy path against a temp repo scaffolded from the reusable executable harness with the `docs-review` archetype.

- `tests/opencode/installed-live-scenarios.json` defines the single bounded installed long-running scenario
- `scripts/opencode-installed-live-harness.ts` scaffolds the temp repo, runs `opencode run --print-logs` on the first turn, adds `--continue` on turns 2 and 3, and validates ordered plan/execute/review/verify flow across the continued transcript
- `tests/opencode-installed-live-harness.test.ts` covers manifest loading, env gating, argv construction, docs-review scaffold reuse, the exact three-command sequence, and later-turn invalidation if a write is not followed by fresh review/verify evidence

The checked-in installed manifest currently covers exactly one scenario:

- a 3-turn `docs-review` happy path that reuses one scaffolded repo/session and requires fresh `review-spec`, `review-quality`, and `bun test` evidence after each later write

By default this lane skips cleanly unless `OPENCODE_INSTALLED_LIVE=1` is set:

```bash
bun run test:opencode:installed
```

To execute the real installed lane:

```bash
OPENCODE_INSTALLED_LIVE=1 bun run test:opencode:installed
```
