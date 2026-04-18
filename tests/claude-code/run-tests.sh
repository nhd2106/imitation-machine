#!/usr/bin/env bash

set -euo pipefail

mode="${1:-fast}"

case "$mode" in
  fast)
    bun test tests/claude-harness.test.ts tests/claude-harness-smoke.test.ts
    ;;
  *)
    printf 'Unsupported mode: %s\n' "$mode" >&2
    printf 'Usage: bash tests/claude-code/run-tests.sh fast\n' >&2
    exit 1
    ;;
esac
