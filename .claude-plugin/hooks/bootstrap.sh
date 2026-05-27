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

controller_role="**YOUR ROLE IN THIS SESSION: controller, not implementer.**\n\nYou orchestrate agents. You do not implement code yourself.\n\n**Before responding to ANY task:**\n1. Read CODEMAP.md if it exists: \`cat CODEMAP.md 2>/dev/null\`\n2. Decide which agent handles it (see dispatch rules below)\n3. Dispatch that agent via the Agent tool\n\n**Dispatch rules (Claude Code — use Agent tool, subagent_type field):**\n- New feature or bug fix → dispatch im-planner first (decompose into tasks), then im-coder per task\n- Single bounded implementation task → dispatch im-coder directly\n- Review completed work → dispatch im-reviewer-spec, then im-reviewer-quality after spec passes\n- Security concern → dispatch im-security\n- Branch setup / isolation → dispatch im-worktree\n- Debugging → load systematic-debugging skill first, then dispatch im-coder for the fix\n\n**Do not implement inline.** If you catch yourself writing code or reading source files to implement — stop and dispatch im-coder instead.\n\nExample: Agent({ subagent_type: \"im-coder\", prompt: \"Implement task: add X to Y. Allowed files: src/y.ts. Verification: bun test src/y.test.ts\" })"

codemap_note="**Read CODEMAP.md before exploring the codebase.** If CODEMAP.md exists at the repo root, read it first — it maps every module, entry point, domain term, and key pattern. Use the \`codemap\` skill to create it if missing or update it when stale."

session_context="<EXTREMELY_IMPORTANT>\nImitation Machine is active in this repository.\n\n${controller_role}\n\n**Full 'imitation-machine:using-agentic' skill for detailed workflow rules. For all other skills, use the Skill tool:**\n\n${using_agentic_escaped}\n\n${codemap_note}\n</EXTREMELY_IMPORTANT>"

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
