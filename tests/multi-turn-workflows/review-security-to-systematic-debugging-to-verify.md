# Multi-Turn Workflow: Review Security To Systematic Debugging To Verify

## Turn 1

User: "Start with `review-security` on this password-reset flow. I suspect security finding `SEC-17` around auth bypass and token leakage, and it should block merge as high severity if confirmed."

Expected behavior:
- load `review-security`
- treat security finding `SEC-17` as high severity and blocking until understood
- preserve the concrete auth bypass and token leakage evidence instead of summarizing it away

## Turn 2

User: "The review found a likely bug path. Switch into `systematic-debugging`, reproduce `SEC-17`, and keep a hypothesis log instead of patching guesses. Right now hypothesis note `H-3` says the reset token survives a fallback auth branch."

Expected behavior:
- hand off from `review-security` to `systematic-debugging`
- carry `SEC-17` into debugging rather than treating it as a generic bug
- reproduce first and maintain a hypothesis log with evidence-based narrowing, including hypothesis note `H-3`

## Turn 3

User: "The cause is narrowed and the fix is in. Use `verify` to produce fresh verification before we say `SEC-17` is resolved. The `H-3` path is closed and the password-reset flow now rejects the leaked token branch."

Expected behavior:
- hand off from `systematic-debugging` to `verify`
- carry forward `SEC-17`, hypothesis note `H-3`, and the password-reset flow evidence into verification
- require fresh verification evidence such as `agentic verify all` before claiming the security issue is fixed
