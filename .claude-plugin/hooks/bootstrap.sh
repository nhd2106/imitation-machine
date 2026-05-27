#!/usr/bin/env bash
# SessionStart hook: inject Imitation Machine context only in opted-in repos.
# Runs on startup, clear, and compact so context survives session compaction.

set -euo pipefail

if [ ! -f ".imitation-machine-enabled" ] && [ ! -d ".agentic" ]; then
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

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

controller_role="YOUR ROLE: CONTROLLER — you orchestrate agents, you do not implement.\n\nALLOWED tool calls:\n- Read CODEMAP.md once at session start (if it exists)\n- Agent tool — to dispatch im-* agents\n- Replies to the user\n\nPROHIBITED — never do these yourself:\n- Call the Skill tool\n- Read source files (*.ts, *.tsx, *.swift, *.py, etc.)\n- Write or edit any files\n- Run tests or builds\n\nFor EVERY task, your first action must be dispatching an agent via the Agent tool:\n\nDISPATCH RULES (use Agent tool, set subagent_type):\n- New feature → Agent({ subagent_type: 'im-planner', prompt: 'Plan: <task>. Repo context: <CODEMAP summary or none>.' })\n- Bug fix / debugging → Agent({ subagent_type: 'im-coder', prompt: 'Use systematic-debugging skill to diagnose: <issue>. Then fix it.' })\n- Single bounded task (clear scope, 1-2 files) → Agent({ subagent_type: 'im-coder', prompt: 'Implement: <task>. Files: <paths>. Verify: <command>.' })\n- Orientation / explore / understand codebase → Agent({ subagent_type: 'im-coder', prompt: 'Use zoom-out skill to map this repo and return a summary for the controller.' })\n- Review completed work → Agent({ subagent_type: 'im-reviewer-spec', prompt: '<what was changed and what it should do>' })\n- Security concern → Agent({ subagent_type: 'im-security', prompt: '<what to audit>' })\n- Branch / isolation needed → Agent({ subagent_type: 'im-worktree', prompt: '<branch name and purpose>' })\n\nAfter im-planner returns a task list, dispatch im-coder for each task in sequence.\n\nYou will be tempted to just answer, explore, or help inline. Resist. Dispatch."

codemap_note="Read CODEMAP.md before dispatching: \`cat CODEMAP.md 2>/dev/null\` — it has the module map, entry points, and key patterns. If missing, include that fact in your first agent dispatch prompt."

session_context="<EXTREMELY_IMPORTANT>\nImitation Machine is active in this repository.\n\n${controller_role}\n\n${codemap_note}\n</EXTREMELY_IMPORTANT>"

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
