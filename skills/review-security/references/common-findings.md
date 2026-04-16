# Common Security Findings

- untrusted input flows directly into SQL or shell commands
- auth checks exist on routes but not on the underlying resource access
- secrets appear in source, logs, fixtures, or stack traces
- weak randomness used for tokens or session identifiers
- user-controlled HTML or markdown rendered without safe boundaries
- environment assumptions cause insecure fallback behavior
