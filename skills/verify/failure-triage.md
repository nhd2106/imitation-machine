# Verification Failure Triage

## If `coverage` fails

- add or tighten tests
- do not lower the threshold

## If `typecheck` fails

- fix types directly
- do not hide the error with `any`

## If `security-secrets` fails

- remove the literal secret
- rotate it if it was real

## If `security-sast` fails

- fix the pattern or code path
- do not suppress it casually

## If tests fail

- fix the failing behavior or test
- rerun verification fully
