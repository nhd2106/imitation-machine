# Quality Review Checklist

## Readability

- names explain behavior
- control flow is understandable without excessive comments

## Structure

- each file has one clear responsibility
- no unnecessary nesting
- logic is split sensibly
- duplication is minimized
- new abstractions pay for themselves
- large-file growth from the change is justified or called out

## Testing Quality

- tests actually test logic, not only mocks or snapshots
- important edge cases are covered with specific assertions
- tests use public behavior where practical
- test setup does not hide the behavior under review

## Safety

- no debug leftovers in production paths
- error handling is explicit where needed
- hardcoded values are justified or extracted

## Repo fit

- follows established patterns
- does not create unnecessary abstractions
