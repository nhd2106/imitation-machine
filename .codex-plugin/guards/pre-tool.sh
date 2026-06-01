#!/usr/bin/env bash
# Codex PreToolUse guard — blocks dangerous writes and git commands

TOOL="${CODEX_TOOL_NAME:-}"
INPUT="${CODEX_TOOL_INPUT:-}"

if [[ "$TOOL" =~ ^(Write|Edit)$ ]]; then
  for protected in ".git/" ".codex-plugin/" "hooks/"; do
    if echo "$INPUT" | grep -qF "$protected"; then
      echo "[im-guard] Blocked: write to protected path containing '$protected'" >&2
      exit 1
    fi
  done
fi

if [[ "$TOOL" == "Bash" ]]; then
  for dangerous in "reset --hard" "push --force" "push -f" "clean -f" "branch -D"; do
    if echo "$INPUT" | grep -qF "$dangerous"; then
      echo "[im-guard] Blocked: dangerous git command '$dangerous'" >&2
      exit 1
    fi
  done
fi

exit 0
