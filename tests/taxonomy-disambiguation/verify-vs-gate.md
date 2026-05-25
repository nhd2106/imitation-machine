# Verify vs. Gate

Both are completion-evidence skills. They serve different purposes in the workflow.

- `verify` — the user-facing completion-claim check. "Before I say this is done, run `agentic verify all` and read the result." Evidence-before-claims discipline.
- `gate` — the enforcement layer underneath. Hard gates (coverage, typecheck, security-secrets, security-sast, spec, quality, plan) that block PRs and releases when they fail. Failing a gate is a workflow blocker, not just a warning.

`verify` calls `gate` internally — `agentic verify all` runs `agentic gate all` then `tsc` then `bun test`. They are layered.

## Ambiguous Prompt 1

"I think the auth refactor is ready — run the checks and tell me if I can commit."

Should pick: `verify`
Should NOT pick: `gate` (alone)

Why: the user is claiming completion. The right tool is `verify`, which runs the full canonical check (`agentic verify all`). `gate` runs a subset and does not include `tsc` or `bun test`.

## Ambiguous Prompt 2

"The coverage gate is failing in CI. What does it want from me?"

Should pick: `gate`
Should NOT pick: `verify`

Why: the user is asking about a specific gate's behavior and failure mode. `gate` owns the enforcement layer. `verify` is the umbrella; the user is below the umbrella.

## Ambiguous Prompt 3

"Make the typecheck pass so I can ship."

Should pick: `gate` (typecheck specifically), then `verify` to confirm overall readiness.
Should NOT pick: `verify` alone.

Why: the immediate ask is to fix a specific gate. After the fix, `verify` confirms the surrounding scope still passes.

## Ambiguous Prompt 4

"Add a new check that fails the build if anyone commits a console.log."

Should pick: `gate`
Should NOT pick: `verify`

Why: the user is asking to add enforcement. `gate` owns gate authoring. `verify` consumes gates; it does not define them.

## Counter-example (non-trigger for both)

"Tests pass locally — looks good, let me commit."

This is the *anti-pattern* that `verify` exists to prevent. Do not skip `verify` because tests look green; the canonical completion claim requires `agentic verify all` evidence (gates + typecheck + tests). "Looks good" without `agentic verify all` is the wording the `verify` red flags explicitly stop on.
