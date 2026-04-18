#!/usr/bin/env bash

set -euo pipefail

mode="${1:-fast}"

case "$mode" in
  fast)
    bun test tests/opencode-harness.test.ts tests/opencode-harness-smoke.test.ts
    ;;
  *)
    printf 'Unsupported mode: %s\n' "$mode" >&2
    printf 'Usage: bash tests/opencode/run-tests.sh fast\n' >&2
    exit 1
    ;;
esac
