# Security Review Checklist

## Secrets

- no literal secrets in code or tests unless clearly fake fixtures in excluded paths
- no secrets in logs or error output
- env-backed secrets handled deliberately

## Inputs

- user input validated at boundaries
- file paths sanitized
- untrusted content not executed or rendered unsafely

## Auth

- protected actions require authentication
- authorization is checked per resource where needed
- session/token logic uses appropriate expiry and validation

## Data and execution

- queries are parameterized
- shell commands do not interpolate untrusted input
- randomness is suitable for security-sensitive uses
