# Conventional Commit Guide

- `feat`: new behavior
- `fix`: bug fix
- `refactor`: internal change without behavior change
- `test`: tests only
- `docs`: docs only
- `chore`: tooling or maintenance
- `perf`: performance improvement
- `ci`: CI workflow change

Use imperative mood and keep the subject concise.

## Hook And History Notes

- a hook failure is a real blocker: fix it instead of using a no-bypass shortcut
- if a hook rewrites files, restage those files and retry the commit
- if a prior commit was already pushed, do not amend pushed history; create a follow-up commit instead
- reserve amend for local-only history that has not been pushed
