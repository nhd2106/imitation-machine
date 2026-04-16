# Testing Anti-Patterns

Use this as a quick reference when pressure makes tests sloppy.

## Common failures

### Writing code first

If implementation exists before the failing test, delete it and restart the cycle.

### Test passes immediately

This means you did not prove the behavior was missing. Fix the test before proceeding.

### Testing mocks instead of behavior

Mocks are only for external boundaries. Prefer asserting observable behavior.

### Giant end-to-end test for a tiny behavior

Start with the smallest failing test that proves the requirement.

### Fixing the test to match the bug

If the code is wrong, fix the code. Do not rewrite the test to bless current behavior unless the spec changed.

### Claiming TDD after the fact

Tests-after are useful, but they are not TDD.
