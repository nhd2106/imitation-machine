# Hook Installation

```sh
cp hooks/pre-commit .git/hooks/pre-commit
cp hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-commit .git/hooks/pre-push
```

These hooks enforce the repo's gate workflow before commit and push.
