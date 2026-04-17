# Parallel Safety Checklist

- Each task has independent inputs.
- Each task has independent outputs or read-only scope.
- No task depends on another task finishing first.
- The controller owns final synthesis.
- Conflicts are handled after results return, not by the runtime agents ad hoc.
