# Parallel Safety Checklist

- Each task has independent inputs.
- Each task has independent outputs or read-only scope.
- No task depends on another task finishing first.
- No two agents will write the same files, generated outputs, caches, branches, or mutable state.
- Each prompt names forbidden overlap and stop conditions.
- The controller owns final synthesis.
- Conflicts are handled after results return, not by the runtime agents ad hoc.
- Compare returned files and conclusions before integrating.
- Run full verification after integrating all parallel results.
