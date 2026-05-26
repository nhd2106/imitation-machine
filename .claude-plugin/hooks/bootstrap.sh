#!/usr/bin/env bash
# SessionStart hook: inject Imitation Machine context only in opted-in repos.
# Runs on startup, clear, and compact so context survives session compaction.

set -euo pipefail

if [ ! -f ".imitation-machine-enabled" ] && [ ! -d ".agentic" ]; then
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

using_agentic_content=$(cat "${PLUGIN_ROOT}/skills/using-agentic/SKILL.md" 2>&1 || echo "Error reading using-agentic skill")

# Fast JSON escaping via bash parameter substitution (no character loops).
escape_for_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

using_agentic_escaped=$(escape_for_json "$using_agentic_content")

claude_agent_map="**Claude Code — Agent dispatch map (use the Agent tool, not @persona syntax):**\nim-coder → bounded TDD implementation of one task\nim-planner → task decomposition from an approved spec\nim-reviewer-spec → Stage 1: does the implementation match the spec?\nim-reviewer-quality → Stage 2: readability, naming, structure\nim-reviewer-final → final holistic production-readiness review\nim-security → security review for auth/input/secrets/injection surfaces\nim-worktree → workspace isolation and branch setup\n\nExample: Agent({ subagent_type: \"im-coder\", prompt: \"Implement task 3: add X to Y. Allowed files: src/y.ts. Verification: bun test src/y.test.ts\" })"

codemap_note="**Read CODEMAP.md before exploring the codebase.** If CODEMAP.md exists at the repo root, read it first — it maps every module, entry point, domain term, and key pattern. Use the \`codemap\` skill to create it if missing or update it when stale."

session_context="<EXTREMELY_IMPORTANT>\nImitation Machine is active in this repository.\n\n**Below is the full content of your 'imitation-machine:using-agentic' skill. For all other skills, use the Skill tool:**\n\n${using_agentic_escaped}\n\n${codemap_note}\n\n${claude_agent_map}\n</EXTREMELY_IMPORTANT>"

# Platform-specific output: Claude Code expects hookSpecificOutput.additionalContext.
# Uses printf instead of heredoc to avoid bash 5.3+ heredoc hang.
if [ -n "${CURSOR_PLUGIN_ROOT:-}" ]; then
  printf '{\n  "additional_context": "%s"\n}\n' "$session_context"
elif [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -z "${COPILOT_CLI:-}" ]; then
  printf '{\n  "hookSpecificOutput": {\n    "hookEventName": "SessionStart",\n    "additionalContext": "%s"\n  }\n}\n' "$session_context"
else
  printf '{\n  "additionalContext": "%s"\n}\n' "$session_context"
fi

exit 0
