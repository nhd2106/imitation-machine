import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";

const ROOT = process.cwd();

function expectContainsAll(content: string, fragments: readonly string[]): void {
  for (const fragment of fragments) {
    expect(content).toContain(fragment);
  }
}

function expectContainsAny(content: string, fragments: readonly string[]): void {
  expect(fragments.some((fragment) => content.includes(fragment))).toBe(true);
}

const DEEPENED_FIXTURE_EXPECTATIONS = {
  "tests/skill-triggering/design-prompts.md": [
    ["visual direction", "aesthetic direction"],
    ["interaction quality", "responsive layout"],
    ["browser validation", "browser"],
  ],
  "tests/skill-triggering/verify-prompts.md": [
    ["exact reproduction", "exact repro"],
    ["smoke test", "partial check"],
    ["ready for review", "done"],
  ],
  "tests/skill-triggering/gate-prompts.md": [["coverage"], ["typecheck"], ["security scan", "security"]],
  "tests/skill-triggering/pr-prompts.md": [
    ["what shipped together", "shipped together"],
    ["draft pr", "draft"],
    ["failing check", "blocking verification", "gone green"],
  ],
  "tests/skill-triggering/release-prompts.md": [["semver"], ["packaging", "package artifact"], ["release evidence", "handoff"]],
  "tests/skill-triggering/repo-prompts.md": [["base branch"], ["transitive dependency", "dependency impact"], ["full run", "full repo"]],
  "tests/skill-triggering/adr-prompts.md": [["team is in a hurry", "schedule pressure"], ["public contract"], ["expensive to reverse", "painful to unwind"]],
  "tests/skill-triggering/commit-prompts.md": [
    ["hook failure", "hook"],
    ["no-bypass", "bypass"],
    ["retry the commit", "retrying the commit", "retry the blocked commit"],
    ["pushed", "already pushed"],
    ["follow-up commit", "follow up commit"],
  ],
  "tests/skill-triggering/writing-skills-prompts.md": [
    ["create", "write", "skill package"],
    ["repair", "fix", "broken"],
    ["validate", "test", "skill package"],
  ],
  "tests/skill-triggering/executing-plans-prompts.md": [
    ["approved plan", "plan is approved"],
    ["execute the next task", "work through the plan", "inline"],
    ["verification evidence", "verification", "proof"],
    ["stop if", "re-evaluate", "scope grows"],
    ["worktree", "isolation", "main/master"],
  ],
  "tests/skill-triggering/tdd-prompts.md": [
    ["red-green-refactor", "red/green/refactor"],
    ["bug", "regression"],
    ["manual test", "manual testing"],
    ["delete", "start over"],
  ],
  "tests/skill-triggering/receiving-code-review-prompts.md": [
    ["external reviewer", "reviewer feedback"],
    ["unclear", "clarification"],
    ["yagni"],
    ["github", "thread"],
  ],
  "tests/skill-triggering/review-final-prompts.md": [
    ["final holistic", "production readiness"],
    ["integrated diff"],
    ["verification evidence"],
    ["does not replace", "review-spec", "review-quality"],
  ],
  "tests/skill-triggering/dispatching-parallel-agents-prompts.md": [
    ["parallel", "independent", "separate"],
    ["shared state", "same file", "overlapping ownership"],
    ["one person", "one place", "bring the results back together"],
  ],
  "tests/skill-triggering/review-security-prompts.md": [
    ["auth", "authentication"],
    ["input handling", "input validation", "untrusted input"],
    ["secrets", "token", "secret"],
    ["severity", "critical", "high"],
    ["block", "blocker", "before merge"],
  ],
  "tests/skill-triggering/systematic-debugging-prompts.md": [
    ["reproduce", "reproducible", "reproduction"],
    ["minimize", "minimal", "smallest"],
    ["hypothesis log", "hypothesis"],
    ["instrumentation", "instrument"],
    ["one variable at a time", "one variable"],
    ["evidence", "narrow"],
    ["random fixes", "guessing", "fixes first"],
  ],
  "tests/skill-triggering/grill-me-prompts.md": [
    ["grill me", "stress-test", "challenge my assumptions"],
    ["one question", "wait for the answer"],
    ["recommended answer", "default answer", "hypothesis"],
    ["do not implement", "no code", "not write code"],
  ],
  "tests/skill-triggering/requirements-brief-prompts.md": [
    ["prd", "requirements brief", "requirements synthesis"],
    ["current context", "existing context"],
    ["out-of-scope", "out of scope"],
    ["issue-slicing", "plan"],
  ],
  "tests/skill-triggering/issue-slicing-prompts.md": [
    ["approved brief", "approved plan"],
    ["vertical drafts", "vertical-slice issue drafts"],
    ["dependencies"],
    ["hitl"],
    ["afk"],
    ["uncertainty"],
    ["approval"],
  ],
  "tests/skill-triggering/zoom-out-prompts.md": [
    ["zoom out", "broader context", "discovery"],
    ["read-only", "do not edit", "no changes"],
    ["non-trigger", "do not load", "stay with"],
  ],
  "tests/explicit-skill-requests/design-prompts.md": [["explicit"], ["`design`"], ["interaction quality", "responsive layout"], ["browser validation", "browser"]],
  "tests/explicit-skill-requests/verify-prompts.md": [["explicit"], ["`verify`"], ["exact reproduction", "exact bug repro"], ["fresh evidence", "evidence"]],
  "tests/explicit-skill-requests/gate-prompts.md": [["explicit"], ["`gate`"], ["coverage"], ["security scan", "security"]],
  "tests/explicit-skill-requests/pr-prompts.md": [["explicit"], ["`pr`"], ["draft pr", "draft"], ["what shipped together", "shipped together"]],
  "tests/explicit-skill-requests/release-prompts.md": [["explicit"], ["`release`"], ["semver"], ["release evidence", "ready or blocked"]],
  "tests/explicit-skill-requests/repo-prompts.md": [["explicit"], ["`repo`"], ["base branch", "release branch"], ["transitive dependency", "dependency impact"]],
  "tests/explicit-skill-requests/adr-prompts.md": [
    ["explicit"],
    ["`adr`"],
    ["public contract"],
    ["fallback plan", "fallback"],
    ["expensive to reverse", "painful to unwind"],
  ],
  "tests/explicit-skill-requests/commit-prompts.md": [
    ["explicit"],
    ["`commit`"],
    ["hook failure", "hook"],
    ["already pushed", "pushed"],
    ["follow-up commit", "follow up commit"],
    ["do not amend", "not amend"],
  ],
  "tests/explicit-skill-requests/executing-plans-prompts.md": [
    ["explicit"],
    ["`executing-plans`"],
    ["approved plan", "approved task"],
    ["work through the plan", "inline", "one planned task at a time"],
    ["worktree", "isolation", "main/master"],
  ],
  "tests/explicit-skill-requests/tdd-prompts.md": [
    ["explicit"],
    ["`tdd`"],
    ["red-green-refactor", "red/green/refactor"],
    ["manual test", "manual testing"],
  ],
  "tests/explicit-skill-requests/receiving-code-review-prompts.md": [
    ["explicit"],
    ["`receiving-code-review`"],
    ["external reviewer", "unclear feedback"],
    ["github thread", "yagni"],
  ],
  "tests/explicit-skill-requests/review-final-prompts.md": [
    ["explicit"],
    ["`review-final`"],
    ["final holistic", "production readiness"],
    ["after task-level reviews", "before release/pr"],
  ],
  "tests/explicit-skill-requests/dispatching-parallel-agents-prompts.md": [
    ["explicit"],
    ["`dispatching-parallel-agents`"],
    ["parallel", "independent", "split this up"],
    ["shared state", "same file", "bring the results back together"],
  ],
  "tests/explicit-skill-requests/review-security-prompts.md": [
    ["explicit"],
    ["`review-security`"],
    ["security review", "security-focused review"],
    ["critical", "high", "severity"],
    ["quality review", "generic quality"],
  ],
  "tests/explicit-skill-requests/systematic-debugging-prompts.md": [
    ["explicit"],
    ["`systematic-debugging`"],
    ["reproduce", "reproduction"],
    ["minimize", "minimal", "smallest"],
    ["instrumentation", "instrument"],
    ["one variable at a time", "one variable"],
    ["hypothesis log", "evidence"],
  ],
  "tests/explicit-skill-requests/grill-me-prompts.md": [
    ["explicit"],
    ["`grill-me`"],
    ["stress-test", "challenge"],
    ["one question", "recommended answer", "hypothesis"],
  ],
  "tests/explicit-skill-requests/requirements-brief-prompts.md": [
    ["explicit"],
    ["`requirements-brief`"],
    ["prd", "requirements brief"],
    ["issue-slicing", "plan"],
  ],
  "tests/explicit-skill-requests/issue-slicing-prompts.md": [
    ["explicit"],
    ["`issue-slicing`"],
    ["vertical drafts", "vertical-slice issue drafts"],
    ["dependencies"],
    ["hitl"],
    ["afk"],
    ["read-only", "no-tracker", "approval"],
  ],
  "tests/explicit-skill-requests/zoom-out-prompts.md": [
    ["explicit"],
    ["`zoom-out`"],
    ["zoom out", "broader context", "discovery"],
    ["read-only", "do not edit", "no changes"],
    ["non-trigger", "do not implement", "implementation"],
  ],
  "tests/skill-triggering/worktree-prompts.md": [["merged cleanup order", "merged cleanup"], ["uncommitted work", "uncommitted changes"], ["remote branch deletion", "remote branch"]],
  "tests/explicit-skill-requests/worktree-prompts.md": [["explicit"], ["`worktree`"], ["local merged-branch cleanup", "local branch"], ["remote branch deletion", "remote branch"]],
  "tests/skill-triggering/finishing-a-development-branch-prompts.md": [["uncommitted work", "uncommitted changes"], ["merged-cleanup sequencing", "merged cleanup"], ["remote deletion optional", "optional remote deletion"]],
  "tests/multi-turn-workflows/repo-to-scope-to-verify.md": [["base branch"], ["affected package"], ["scoped verification"], ["full verification"]],
  "tests/multi-turn-workflows/adr-to-implementation-boundary.md": [["durable decision"], ["adr"], ["implementation handoff"]],
  "tests/multi-turn-workflows/commit-after-hooks-and-verification.md": [
    ["verification evidence"],
    ["retry the commit", "retry commit"],
    ["pushed", "already pushed"],
    ["follow-up commit", "follow up commit"],
    ["bypass"],
  ],
  "tests/multi-turn-workflows/plan-to-subagent-review-to-verify.md": [
    ["plan id", "pln-903", "pln-"],
    ["task id", "tsk-410", "tsk-"],
    ["review outcome", "spec passed", "quality passed"],
    ["verification evidence", "agentic verify all", "fresh verification"],
  ],
} as const;

const EXPECTED_MATRIX_FIXTURES = {
  design: "tests/skill-triggering/design-prompts.md",
} as const;

const EXPECTED_PRESSURE_MATRIX_FIXTURES = {
  verify: "tests/explicit-skill-requests/verify-prompts.md",
  gate: "tests/explicit-skill-requests/gate-prompts.md",
  pr: "tests/explicit-skill-requests/pr-prompts.md",
  release: "tests/explicit-skill-requests/release-prompts.md",
  repo: "tests/explicit-skill-requests/repo-prompts.md",
  adr: "tests/explicit-skill-requests/adr-prompts.md",
  commit: "tests/explicit-skill-requests/commit-prompts.md",
  "executing-plans": "tests/explicit-skill-requests/executing-plans-prompts.md",
  tdd: "tests/explicit-skill-requests/tdd-prompts.md",
  "receiving-code-review": "tests/explicit-skill-requests/receiving-code-review-prompts.md",
  "review-final": "tests/explicit-skill-requests/review-final-prompts.md",
  "dispatching-parallel-agents": "tests/explicit-skill-requests/dispatching-parallel-agents-prompts.md",
  "review-security": "tests/explicit-skill-requests/review-security-prompts.md",
  "systematic-debugging": "tests/explicit-skill-requests/systematic-debugging-prompts.md",
  "grill-me": "tests/explicit-skill-requests/grill-me-prompts.md",
} as const;

const EXPLICIT_PER_PROMPT_FIXTURES = [
  "tests/explicit-skill-requests/using-agentic-prompts.md",
  "tests/explicit-skill-requests/tdd-prompts.md",
  "tests/explicit-skill-requests/plan-prompts.md",
  "tests/explicit-skill-requests/brainstorm-prompts.md",
  "tests/explicit-skill-requests/design-prompts.md",
  "tests/explicit-skill-requests/worktree-prompts.md",
  "tests/explicit-skill-requests/requesting-code-review-prompts.md",
  "tests/explicit-skill-requests/receiving-code-review-prompts.md",
  "tests/explicit-skill-requests/review-final-prompts.md",
  "tests/explicit-skill-requests/verify-prompts.md",
  "tests/explicit-skill-requests/gate-prompts.md",
  "tests/explicit-skill-requests/pr-prompts.md",
  "tests/explicit-skill-requests/release-prompts.md",
  "tests/explicit-skill-requests/repo-prompts.md",
  "tests/explicit-skill-requests/adr-prompts.md",
  "tests/explicit-skill-requests/commit-prompts.md",
  "tests/explicit-skill-requests/writing-skills-prompts.md",
  "tests/explicit-skill-requests/executing-plans-prompts.md",
  "tests/explicit-skill-requests/dispatching-parallel-agents-prompts.md",
  "tests/explicit-skill-requests/review-security-prompts.md",
  "tests/explicit-skill-requests/systematic-debugging-prompts.md",
  "tests/explicit-skill-requests/grill-me-prompts.md",
  "tests/explicit-skill-requests/requirements-brief-prompts.md",
  "tests/explicit-skill-requests/issue-slicing-prompts.md",
  "tests/explicit-skill-requests/zoom-out-prompts.md",
] as const;

const SKILL_TRIGGER_LOAD_EXPECTATIONS = {
  "tests/skill-triggering/tdd-prompts.md": "`tdd`",
  "tests/skill-triggering/receiving-code-review-prompts.md": "`receiving-code-review`",
  "tests/skill-triggering/review-final-prompts.md": "`review-final`",
  "tests/skill-triggering/systematic-debugging-prompts.md": "`systematic-debugging`",
  "tests/skill-triggering/requirements-brief-prompts.md": "`requirements-brief`",
  "tests/skill-triggering/issue-slicing-prompts.md": "`issue-slicing`",
} as const;

const AVOID_JARGON_PHRASES = {
  "tests/skill-triggering/verify-prompts.md": ["confidence-only"],
  "tests/skill-triggering/pr-prompts.md": ["grouped tasks traceability"],
  "tests/skill-triggering/repo-prompts.md": ["comparison base uncertainty", "scoped-vs-full"],
  "tests/skill-triggering/review-security-prompts.md": ["severity-oriented"],
  "tests/skill-triggering/systematic-debugging-prompts.md": ["fix-jumping"],
  "tests/explicit-skill-requests/systematic-debugging-prompts.md": ["fix-jumping"],
  "tests/skill-triggering/executing-plans-prompts.md": ["direct lane"],
  "tests/explicit-skill-requests/executing-plans-prompts.md": ["direct lane"],
  "tests/skill-triggering/dispatching-parallel-agents-prompts.md": ["safe parallelism", "safe parallel fanout", "merge coordinator"],
  "tests/explicit-skill-requests/dispatching-parallel-agents-prompts.md": ["safe parallel fanout", "merge coordinator"],
  "tests/multi-turn-workflows/dispatching-parallel-agents-safe-fanout.md": ["safe parallel fanout", "merge coordinator"],
  "tests/skill-triggering/writing-skills-prompts.md": ["baseline evidence", "prompt fixtures", "evaluation evidence"],
  "tests/explicit-skill-requests/writing-skills-prompts.md": [
    "baseline evidence",
    "prompt-fixture coverage",
    "evaluation evidence",
  ],
  "tests/multi-turn-workflows/writing-skill-to-validate-to-fix.md": [
    "baseline evidence",
    "validation evidence",
    "fix handoff",
  ],
} as const;

const DISTINCT_SCENARIO_EXPECTATIONS = {
  "tests/skill-triggering/tdd-prompts.md": [
    [/bug|regression/, /failing test|red/, /green/],
    [/manual test|manual testing/, /reject|not enough|automated/],
    [/code already written|wrote code first/, /delete|start over/],
  ],
  "tests/explicit-skill-requests/tdd-prompts.md": [
    [/`tdd`/, /red-green-refactor|red\/green\/refactor/],
    [/`tdd`/, /passes immediately|immediate pass/, /fix the test|red/],
    [/`tdd`/, /manual test|manual testing/, /automated/],
  ],
  "tests/skill-triggering/receiving-code-review-prompts.md": [
    [/external reviewer/, /check|verify/, /technical reasoning|push back/],
    [/unclear feedback|unclear/, /stop|clarification/, /do not implement/],
    [/github|thread/, /top-level pr comment|inline/, /reply/],
  ],
  "tests/explicit-skill-requests/receiving-code-review-prompts.md": [
    [/`receiving-code-review`/, /external reviewer/, /suggestion|not an order/],
    [/`receiving-code-review`/, /unclear feedback|clarification/, /stop/],
    [/`receiving-code-review`/, /yagni/, /github thread|thread reply/],
  ],
  "tests/skill-triggering/executing-plans-prompts.md": [
    [/approved plan/, /next task|work through/, /verification/],
    [/worktree|isolation/, /non-trivial|main\/master/, /verify|check/],
    [/scope grows|extra work/, /stop|re-evaluate/],
  ],
  "tests/explicit-skill-requests/executing-plans-prompts.md": [
    [/`executing-plans`/, /approved plan|approved task/, /one planned task/],
    [/`executing-plans`/, /main\/master|unverified isolation/, /stop|worktree/],
  ],
  "tests/skill-triggering/review-final-prompts.md": [
    [/final holistic|production readiness/, /integrated diff/, /verification evidence/],
    [/after task-level/, /review-spec|review-quality/, /does not replace/],
    [/security|qa|documentation/, /risk/, /before release\/pr|before pr/],
  ],
  "tests/explicit-skill-requests/review-final-prompts.md": [
    [/`review-final`/, /final holistic|production readiness/, /integrated diff/],
    [/`review-final`/, /after task-level reviews/, /before release\/pr/],
  ],
  "tests/skill-triggering/review-security-prompts.md": [
    [/auth|authorization/, /input|validation|untrusted input/, /block|merge/],
    [/secret|token/, /severity|high-severity|critical|high/],
    [/deadline pressure|waved through/, /auth bypass|secret leakage|logs/],
  ],
  "tests/explicit-skill-requests/review-security-prompts.md": [
    [/auth rollout|password-reset endpoint/, /security review/, /generic quality review|style notes/],
    [/secrets|token/, /untrusted input|validation/, /blocker|blocking/],
  ],
  "tests/skill-triggering/systematic-debugging-prompts.md": [
    [/fails sometimes|intermittent|flaky/, /reproduce|reproduction/],
    [/hypothesis log/, /minimize|minimal|smallest/, /evidence-based narrowing|evidence/],
    [/instrumentation|instrument/, /evidence/, /one variable at a time|one variable/],
    [/patch three files|random fixes/, /debug systematically|slow this down/],
  ],
  "tests/explicit-skill-requests/systematic-debugging-prompts.md": [
    [/reproduce|reproducible/, /hypothesis log|logged hypotheses/],
    [/minimize|minimal|smallest/, /instrumentation|instrument/],
    [/one variable at a time|one variable/, /confirm or kill|confirm\/kill|kill/],
    [/random patches/, /evidence/, /likely cause|narrows the cause/],
  ],
  "tests/skill-triggering/grill-me-prompts.md": [
    [/grill me/, /one question/, /recommended answer|default answer|hypothesis/],
    [/stress-test|stress test/, /assumption|risk|edge case/, /do not implement|no code/],
    [/vague request|normal clarification/, /brainstorm|@po/, /do not auto-trigger/],
  ],
  "tests/explicit-skill-requests/grill-me-prompts.md": [
    [/`grill-me`/, /explicit/, /hard interview|challenge/],
    [/`grill-me`/, /stress-test|stress test/, /recommended answer|hypothesis/],
    [/`grill-me`/, /do not implement|no code/, /summary|grill summary/],
  ],
  "tests/skill-triggering/requirements-brief-prompts.md": [
    [/current context|existing context/, /prd|requirements brief/, /planning|issue-slicing/],
    [/no-new-interviewing|do not interview|without another interview/, /blocked ambiguity|blocking ambiguity/, /inspect|repo|docs/],
    [/out-of-scope|out of scope/, /acceptance criteria|test notes/, /handoff|next skill|issue-slicing|plan/],
  ],
  "tests/skill-triggering/issue-slicing-prompts.md": [
    [/approved brief|approved requirements brief|approved plan/, /vertical drafts|vertical-slice issue drafts/, /read-only/],
    [/dependencies/, /hitl/, /afk/],
    [/uncertainty/, /approval-gated|approval/, /handoff|plan|@po|implementation/],
  ],
  "tests/explicit-skill-requests/requirements-brief-prompts.md": [
    [/`requirements-brief`/, /explicit/, /prd|requirements brief/],
    [/`requirements-brief`/, /explicit/, /no-new-interviewing|without another interview|blocking ambiguity/],
    [/`requirements-brief`/, /explicit/, /out-of-scope|issue-slicing|plan/],
  ],
  "tests/explicit-skill-requests/issue-slicing-prompts.md": [
    [/`issue-slicing`/, /explicit/, /vertical drafts|vertical-slice issue drafts/, /issue drafts/],
    [/`issue-slicing`/, /explicit/, /dependencies/, /hitl/, /afk/],
    [/`issue-slicing`/, /explicit/, /read-only/, /no-tracker|no tracker/, /approval|implementation/],
  ],
  "tests/skill-triggering/zoom-out-prompts.md": [
    [/zoom out|broader context|discovery/, /load `zoom-out`/, /read-only/],
    [/read-only|do not edit|no changes/, /inspect|survey|discover/, /boundary/],
    [/implement|fix|change|edit/, /non-trigger|do not load `zoom-out`|stay with current skill/],
  ],
  "tests/explicit-skill-requests/zoom-out-prompts.md": [
    [/`zoom-out`/, /explicit/, /zoom out|broader context|discovery/],
    [/`zoom-out`/, /explicit/, /read-only|do not edit|no changes/],
    [/`zoom-out`/, /explicit/, /non-trigger|implementation boundary|do not implement/],
  ],
  "tests/skill-triggering/dispatching-parallel-agents-prompts.md": [
    [/parallel|split/, /independent|independence/],
    [/shared state|same file|overlapping ownership/, /refuse|do not split|not parallel/],
    [/bring the results back together|one place|one person/, /conflict|contradiction|final answer|synthesis/],
  ],
  "tests/explicit-skill-requests/dispatching-parallel-agents-prompts.md": [
    [/`dispatching-parallel-agents`/, /parallel|split this up|independent/],
    [/shared state|same file/, /refuse|keep together|not independent/],
    [/bring the results back together|one place|one person/, /resolve contradictions|contradiction|conflict/],
  ],
  "tests/multi-turn-workflows/systematic-debugging-to-fix.md": [
    [/production-only|intermittent/, /reproduce first/],
    [/hypothesis log/, /evidence/],
    [/fix handoff|bounded fix plan/, /evidence trail|cause is narrowed/],
  ],
  "tests/skill-triggering/writing-skills-prompts.md": [
    [/keep reaching for docs|new skill|from scratch/, /skill/, /failing test|first/],
    [/not following|still .*following|still skip|keep skipping/, /skill/, /fix|repair|tighten/],
    [/before we ship|try this on|dry run/, /skill/, /test|validate|check/],
  ],
  "tests/explicit-skill-requests/writing-skills-prompts.md": [
    [/`writing-skills`/, /write|create/, /skill/],
    [/`writing-skills`/, /fix|repair/, /skill/],
    [/`writing-skills`/, /test|validate|try/, /skill/],
  ],
  "tests/multi-turn-workflows/writing-skill-to-validate-to-fix.md": [
    [/writing-skills/, /release handoff|checklist/, /failing test|transcript/],
    [/try it|validate|test/, /same transcript|same failure/, /test prompts|dry run/],
    [/fix|repair/, /same notes|same transcript|same examples/, /rewrite|rewriting|tighten|update/],
  ],
} as const;

const EXPECTED_MULTI_TURN_DEPTH = {
  "tests/multi-turn-workflows/using-agentic-to-tdd-to-verify.md": [
    "using-agentic",
    "tdd",
    "verify",
    "failing test",
    "fresh verification",
  ],
  "tests/multi-turn-workflows/requesting-to-receiving-code-review.md": [
    "requesting-code-review",
    "receiving-code-review",
    "review request",
    "review feedback",
  ],
  "tests/multi-turn-workflows/subagent-review-loop.md": [
    "subagent-driven-development",
    "review-spec",
    "review-quality",
    "no skipped stage",
  ],
  "tests/multi-turn-workflows/worktree-before-coder.md": [
    "worktree",
    "coder",
    "release",
  ],
  "tests/multi-turn-workflows/design-to-browser-validation.md": [
    "design",
    "direction lock",
    "implementation handoff",
    "browser validation",
  ],
  "tests/multi-turn-workflows/systematic-debugging-to-fix.md": [
    "systematic-debugging",
    "reproduce first",
    "hypothesis log",
    "fix handoff",
  ],
  "tests/multi-turn-workflows/verify-to-gate-to-pr.md": [
    "verify",
    "gate",
    "pr",
    "fresh verification",
    "draft pr",
  ],
  "tests/multi-turn-workflows/release-to-finishing-a-development-branch.md": [
    "release",
    "finishing-a-development-branch",
    "release evidence",
    "finish the branch",
  ],
  "tests/multi-turn-workflows/repo-to-plan-to-subagent-driven-development.md": [
    "repo",
    "plan",
    "subagent-driven-development",
    "affected package",
    "task by task",
  ],
  "tests/multi-turn-workflows/plan-to-executing-plans.md": [
    "plan",
    "executing-plans",
    "approved plan",
    "verification evidence",
    "task",
  ],
  "tests/multi-turn-workflows/dispatching-parallel-agents-safe-fanout.md": [
    "dispatching-parallel-agents",
    "parallel",
    "shared state",
    "bring the results back together",
    "contradiction",
  ],
  "tests/multi-turn-workflows/review-security-to-systematic-debugging-to-verify.md": [
    "review-security",
    "systematic-debugging",
    "verify",
    "security finding",
    "hypothesis log",
    "fresh verification",
  ],
  "tests/multi-turn-workflows/repo-to-scope-to-verify.md": [
    "repo",
    "base branch",
    "affected package",
    "scoped verification",
    "full verification",
    "verify",
  ],
  "tests/multi-turn-workflows/adr-to-implementation-boundary.md": [
    "adr",
    "durable decision",
    "public contract",
    "implementation handoff",
  ],
  "tests/multi-turn-workflows/commit-after-hooks-and-verification.md": [
    "commit",
    "verification evidence",
    "hook",
    "no bypass",
    "retry commit",
    "follow-up commit",
    "pushed",
  ],
  "tests/multi-turn-workflows/writing-skill-to-validate-to-fix.md": [
    "writing-skills",
    "release handoff",
    "failing test",
    "test prompts",
    "same transcript",
    "fix",
  ],
  "tests/multi-turn-workflows/plan-to-subagent-review-to-verify.md": [
    "plan",
    "subagent-driven-development",
    "review-spec",
    "review-quality",
    "verify",
    "plan id",
    "task id",
    "review outcome",
    "verification evidence",
  ],
} as const;

const EXPECTED_MULTI_TURN_PROGRESSIONS = {
  "tests/multi-turn-workflows/verify-to-gate-to-pr.md": [
    ["`verify`", "agentic verify all", "coverage 81.4%", "typecheck clean", "112 tests passed"],
    ["`gate`", "coverage 79.8%", "security scan", "blocking", "cve-2026-4101"],
    ["`pr`", "coverage 82.1%", "security scan clean", "draft pr", "what shipped together"],
  ],
  "tests/multi-turn-workflows/release-to-finishing-a-development-branch.md": [
    ["`release`", "v1.4.2", "release evidence", "dist/imitation-machine-1.4.2.tgz", "sha256:9f3c"],
    ["`finishing-a-development-branch`", "v1.4.2", "merged into `main`", "release evidence", "branch cleanup"],
    ["git status: clean", "safe local cleanup", "git branch -d release/v1.4.2", "remote deletion is optional"],
  ],
  "tests/multi-turn-workflows/repo-to-plan-to-subagent-driven-development.md": [
    ["`repo`", "packages/web", "packages/build-utils", "dependency impact", "base branch `origin/main`"],
    ["`plan`", "pln-742", "tsk-201", "tsk-202", "packages/build-utils"],
    ["`subagent-driven-development`", "pln-742", "tsk-201", "tsk-202", "fresh workers", "review gates"],
  ],
  "tests/multi-turn-workflows/plan-to-executing-plans.md": [
    ["`plan`", "approved", "task", "verification evidence"],
    ["`executing-plans`", "approved plan", "next task", "verification evidence"],
    ["`executing-plans`", "carry forward", "verification evidence", "stop if"],
  ],
  "tests/multi-turn-workflows/dispatching-parallel-agents-safe-fanout.md": [
    ["`dispatching-parallel-agents`", "independent checks", "parallel", "safety check"],
    ["shared state", "same file", "keep together", "not safe to split", "contradiction"],
    ["bring the results back together", "resolve contradictions", "single synthesis", "verification evidence"],
  ],
  "tests/multi-turn-workflows/review-security-to-systematic-debugging-to-verify.md": [
    ["`review-security`", "sec-17", "auth bypass", "token leakage", "high severity"],
    ["`systematic-debugging`", "sec-17", "hypothesis log", "h-3", "reproduce"],
    ["`verify`", "sec-17", "h-3", "agentic verify all", "fresh verification", "password-reset flow"],
  ],
  "tests/multi-turn-workflows/repo-to-scope-to-verify.md": [
    ["`repo`", "origin/release/2026-q2", "packages/web", "packages/config", "affected packages"],
    ["`repo`", "origin/release/2026-q2", "packages/web", "packages/config", "scoped verification", "full verification"],
    ["`verify`", "origin/release/2026-q2", "packages/web", "packages/config", "agentic verify all", "fresh verification"],
  ],
  "tests/multi-turn-workflows/adr-to-implementation-boundary.md": [
    ["`adr`", "adr-019", "public contract", "durable decision", "expensive to reverse"],
    ["`adr`", "adr-019", "record the adr", "accepted", "implementation boundary"],
    ["implementation handoff", "adr-019", "accepted", "durable decision", "before coding"],
  ],
  "tests/multi-turn-workflows/commit-after-hooks-and-verification.md": [
    ["`commit`", "verification evidence", "agentic verify all", "no bypass", "hook-aware"],
    ["hook", "pre-commit", "auto-formatted", "stage the hook changes", "retry the commit"],
    ["prior commit", "pushed", "follow-up commit", "do not amend", "no bypass"],
  ],
  "tests/multi-turn-workflows/writing-skill-to-validate-to-fix.md": [
    [/`writing-skills`/, /release handoff|skill/, /failing test|transcript/, /write|draft|create/],
    [/`writing-skills`/, /same transcript|same failure/, /test prompts|dry run|try it/, /validate|check/],
    [/`writing-skills`/, /same transcript|same notes|same examples/, /fix|repair|tighten/, /rewrite|rewriting|update/],
  ],
  "tests/multi-turn-workflows/plan-to-subagent-review-to-verify.md": [
    ["`plan`", "pln-903", "tsk-410", "approved", "single task chain"],
    ["`subagent-driven-development`", "pln-903", "tsk-410", "review-spec", "review-quality"],
    ["`review-spec`", "tsk-410", "spec passed", "review outcome"],
    ["`review-quality`", "tsk-410", "passed", "review outcome", "ready for verify"],
    [
      "`verify`",
      "pln-903",
      "tsk-410",
      "spec passed",
      "quality passed",
      "agentic verify all",
      "fresh verification",
      "verification evidence",
    ],
  ],
} as const;

const MULTI_TURN_SINGLE_TASK_CHAIN_FIXTURES = {
  "tests/multi-turn-workflows/plan-to-subagent-review-to-verify.md": "tsk-410",
} as const;

const STRONG_INTENT_PHRASES = {
  design: ["visual direction", "interaction quality", "browser validation"],
  repo: ["affected package", "dependency impact", "monorepo"],
  adr: ["architectural decision", "expensive to reverse", "public contract"],
  commit: ["conventional commit", "traceability", "verified"],
  "subagent-driven-development": ["task by task", "fresh workers", "review gates"],
  "executing-plans": ["approved plan", "one planned task at a time", "work through the plan"],
  "review-quality": ["review quality", "maintainability", "severity calibration"],
  "review-final": ["final holistic", "production readiness", "integrated diff"],
  "review-security": ["review security", "security finding", "severity"],
  "review-spec": ["review spec", "spec review", "compliance"],
  "requesting-code-review": ["review request", "ask for review", "reviewers should focus"],
  "receiving-code-review": ["review comments", "review feedback", "fix summary"],
  "systematic-debugging": ["hypothesis log", "systematic debugging", "reproducible"],
  "dispatching-parallel-agents": ["parallel", "independent", "runtime agents"],
  "finishing-a-development-branch": ["finish the branch", "branch-finish", "handoff"],
  "grill-me": ["grill me", "stress-test", "challenge my assumptions"],
  "zoom-out": ["zoom out", "read-only discovery", "broader context"],
} as const satisfies Record<string, readonly string[]>;

async function exists(relativePath: string): Promise<boolean> {
  return Bun.file(join(ROOT, relativePath)).exists();
}

async function readFixture(relativePath: string): Promise<string> {
  return Bun.file(join(ROOT, relativePath)).text();
}

async function fixturePaths(directory: string): Promise<string[]> {
  const entries = await readdir(join(ROOT, directory));
  return entries
    .filter((entry) => entry.endsWith(".md"))
    .sort()
    .map((entry) => join(directory, entry));
}

function getComparisonMatrixRow(content: string, skill: string): string {
  const row = content
    .split("\n")
    .find((line) => line.startsWith(`| \`${skill}\` |`));

  expect(row, `${skill} matrix row should exist`).toBeDefined();
  return row ?? "";
}

function comparisonMatrixColumns(row: string): string[] {
  return row
    .split("|")
    .slice(1, -1)
    .map((column) => column.trim());
}

function expectedBehaviorBlocks(content: string): string[] {
  return content.match(/Expected behavior:\n(?:- .+\n?)+/g) ?? [];
}

function assertStructuredSectionsAreCoherent(content: string, sectionLabel: "Prompt" | "Turn"): void {
  const headingPattern = new RegExp(`^## ${sectionLabel} \\d+`, "gm");
  const matches = [...content.matchAll(headingPattern)];

  expect(matches.length).toBeGreaterThan(0);

  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index]?.index ?? 0;
    const end = matches[index + 1]?.index ?? content.length;
    const section = content.slice(start, end);

    expect(section).toContain(`## ${sectionLabel}`);
    expect(section).toMatch(/Expected behavior:\n(?:- .+\n?)+/);

    if (sectionLabel === "Turn") {
      expect(section).toMatch(/User: ".+"/);
    } else {
      expect(section).toMatch(/^".+"$/m);
    }
  }
}

function structuredPromptSections(content: string): string[] {
  const headingPattern = /^## Prompt \d+/gm;
  const matches = [...content.matchAll(headingPattern)];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? content.length;
    return content.slice(start, end);
  });
}

function structuredSections(content: string, sectionLabel: "Prompt" | "Turn"): string[] {
  const headingPattern = new RegExp(`^## ${sectionLabel} \\d+`, "gm");
  const matches = [...content.matchAll(headingPattern)];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? content.length;
    return content.slice(start, end);
  });
}

function meaningfulPromptLines(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ") || line.startsWith('"'));
}

function inferFixtureIntent(relativePath: string): { kind: "skill" | "routing"; tokens: string[] } {
  const slug = basename(relativePath, ".md").replace(/-prompts$/, "");

  switch (slug) {
    case "persona-agent-routing":
      return { kind: "routing", tokens: ["@po", "@planner", "@coder"] };
    case "worktree-routing":
      return { kind: "routing", tokens: ["@worktree", "@coder"] };
    case "pr":
      return { kind: "skill", tokens: ["pr", "pull request"] };
    case "tdd":
      return { kind: "skill", tokens: ["tdd", "test-first", "failing test"] };
    default:
      return {
        kind: "skill",
        tokens: [slug, slug.replaceAll("-", " "), ...slug.split("-")],
      };
  }
}

function strongIntentTokens(relativePath: string): string[] {
  const slug = basename(relativePath, ".md").replace(/-prompts$/, "");
  const mapped = STRONG_INTENT_PHRASES[slug as keyof typeof STRONG_INTENT_PHRASES];

  if (mapped) {
    return [...mapped];
  }

  const phrase = slug.replaceAll("-", " ");
  return slug.includes("-") ? [phrase] : [phrase, `\`${slug}\``];
}

function assertStructuredPromptContent(content: string): void {
  const behaviorBlocks = expectedBehaviorBlocks(content);

  expect(content.includes("## Prompt 1")).toBe(true);
  expect(behaviorBlocks.length).toBeGreaterThan(0);
  assertStructuredSectionsAreCoherent(content, "Prompt");

  for (const block of behaviorBlocks) {
    const bullets = block.split("\n").filter((line) => line.startsWith("- "));
    expect(bullets.length).toBeGreaterThan(0);
    for (const bullet of bullets) {
      expect(bullet.replace(/^\-\s+/, "").trim().length).toBeGreaterThan(8);
    }
  }
}

function assertFixtureIntentAlignment(relativePath: string, content: string): void {
  const intent = inferFixtureIntent(relativePath);
  const lowerContent = content.toLowerCase();
  const strongMatches = strongIntentTokens(relativePath).filter((token) =>
    lowerContent.includes(token.toLowerCase()),
  );

  if (relativePath.includes("tests/explicit-skill-requests/")) {
    expect(intent.kind).toBe("skill");
    expect(content.includes(`\`${intent.tokens[0]}\``)).toBe(true);
    expect(lowerContent).toContain("explicit");
    expect(strongMatches.length).toBeGreaterThan(0);
    return;
  }

  if (intent.kind === "skill") {
    expect(strongMatches.length).toBeGreaterThan(0);
    if (content.includes("## Prompt 1")) {
      expect(content.includes("Expected behavior:")).toBe(true);
    }
  } else {
    expect(content.includes("@")).toBe(true);
  }
}

function assertExplicitRequestPromptSections(relativePath: string, content: string): void {
  const intent = inferFixtureIntent(relativePath);

  expect(intent.kind).toBe("skill");

  for (const section of structuredPromptSections(content)) {
    const promptLine = section.match(/"(.+)"/)?.[1] ?? "";
    const lowerPromptLine = promptLine.toLowerCase();
    const lowerSection = section.toLowerCase();

    expect(lowerPromptLine).toContain("explicit");
    expect(promptLine).toContain(`\`${intent.tokens[0]}\``);
    expect(lowerSection).toMatch(/expected behavior:\n(?:- .+\n?)+/);
    expect(lowerSection).toMatch(/- .*(load|honor|interpret)/);
  }
}

async function expectPromptFixture(
  relativePath: string,
  options?: { requireStructuredPrompts?: boolean },
): Promise<void> {
  expect(await exists(relativePath)).toBe(true);

  const content = await readFixture(relativePath);
  expect(content.startsWith("# ")).toBe(true);

  if (options?.requireStructuredPrompts) {
    assertStructuredPromptContent(content);
    return;
  }

  const structuredSections = content.match(/## Prompt \d+/g) ?? [];
  const behaviorBlocks = expectedBehaviorBlocks(content);

  if (structuredSections.length > 0 || behaviorBlocks.length > 0) {
    assertStructuredPromptContent(content);
    return;
  }

  const prompts = meaningfulPromptLines(content);
  expect(prompts.length).toBeGreaterThanOrEqual(2);
  for (const prompt of prompts) {
    expect(prompt.replace(/^[-"]\s*/, "").trim().length).toBeGreaterThan(20);
  }
}

async function expectMultiTurnFixture(relativePath: string): Promise<void> {
  expect(await exists(relativePath)).toBe(true);

  const content = await readFixture(relativePath);
  expect(content.startsWith("# ")).toBe(true);
  expect(content.includes("## Turn 1")).toBe(true);
  assertStructuredSectionsAreCoherent(content, "Turn");
}

function assertDistinctScenarioCoverage(
  sections: readonly string[],
  scenarios: readonly (readonly RegExp[])[],
): void {
  const candidateSectionIndexes = scenarios.map((scenarioMatchers) =>
    sections
      .map((section, index) =>
        scenarioMatchers.every((matcher) => matcher.test(section.toLowerCase())) ? index : -1,
      )
      .filter((index) => index >= 0),
  );

  for (const candidates of candidateSectionIndexes) {
    expect(candidates.length).toBeGreaterThan(0);
  }

  const assignedSections = new Set<number>();

  for (const candidates of [...candidateSectionIndexes].sort((left, right) => left.length - right.length)) {
    const distinctCandidate = candidates.find((index) => !assignedSections.has(index));
    assignedSections.add(distinctCandidate ?? candidates[0]!);
  }

  expect(assignedSections.size).toBeGreaterThanOrEqual(scenarios.length);
}

type TurnExpectation = string | RegExp;

function assertTurnLevelProgression(content: string, turnExpectations: readonly (readonly TurnExpectation[])[]): void {
  const turns = structuredSections(content, "Turn");
  expect(turns.length).toBeGreaterThanOrEqual(turnExpectations.length);

  for (const [index, requiredFragments] of turnExpectations.entries()) {
    const turn = turns[index] ?? "";
    const lowerTurn = turn.toLowerCase();

    for (const fragment of requiredFragments) {
      if (typeof fragment === "string") {
        expect(lowerTurn, `turn ${index + 1} should contain ${fragment}`).toContain(fragment.toLowerCase());
        continue;
      }

      expect(lowerTurn, `turn ${index + 1} should match ${fragment}`).toMatch(fragment);
    }
  }
}

function assertSingleTaskChain(content: string, expectedTaskId: string): void {
  const turns = structuredSections(content, "Turn");
  const taskIds = [...content.matchAll(/tsk-\d+/g)].map((match) => match[0]);
  const distinctTaskIds = [...new Set(taskIds)];

  expect(distinctTaskIds).toEqual([expectedTaskId]);

  for (const [index, turn] of turns.entries()) {
    expect(turn.toLowerCase(), `turn ${index + 1} should carry ${expectedTaskId}`).toContain(expectedTaskId);
  }
}

describe("prompt fixture suites", () => {
  test("rejects prompt fixtures whose prompt sections lack a nearby expected behavior block", () => {
    const content = `# Example\n\n## Prompt 1\n\n"Do the thing."\n\n## Prompt 2\n\n"Do the other thing."\n\nExpected behavior:\n- load the right skill\n`;

    expect(() => assertStructuredSectionsAreCoherent(content, "Prompt")).toThrow(
      "Expected behavior",
    );
  });

  test("rejects multi-turn fixtures that only provide one behavior block for the whole file", () => {
    const content = `# Example\n\n## Turn 1\n\nUser: "Start here."\n\n## Turn 2\n\nUser: "Now continue."\n\nExpected behavior:\n- stay coherent\n`;

    expect(() => assertStructuredSectionsAreCoherent(content, "Turn")).toThrow(
      "Expected behavior",
    );
  });

  test("rejects sections satisfied only by incidental quoted text instead of a dedicated prompt line", () => {
    const content = `# Example\n\n## Prompt 1\n\nContext: the reviewer wrote "please help" in a log snippet.\n\nExpected behavior:\n- load the right skill\n`;

    expect(() => assertStructuredSectionsAreCoherent(content, "Prompt")).toThrow();
  });

  test("rejects explicit skill-request fixtures that use the old loose fallback format", () => {
    const content = `# Example\n\n- Please use \`design\` explicitly for this page.\n- Keep the visual direction clear.`;

    expect(() => assertStructuredPromptContent(content)).toThrow();
  });

  test("rejects mislabeled fixtures satisfied only by weak token fragments", () => {
    const content = `# Example\n\n## Prompt 1\n\n"Please do a quality pass on this repo."\n\nExpected behavior:\n- review the repo carefully\n`;

    expect(() =>
      assertFixtureIntentAlignment("tests/skill-triggering/review-quality-prompts.md", content),
    ).toThrow();
  });

  test("rejects explicit request fixtures when any prompt is only implicitly routed", () => {
    const content = `# Example\n\n## Prompt 1\n\n"Use \`plan\` explicitly for this approved requirement."\n\nExpected behavior:\n- load \`plan\`\n- honor the explicit request\n\n## Prompt 2\n\n"The requirement is approved. Write the implementation plan now."\n\nExpected behavior:\n- move to planning\n`;

    expect(() =>
      assertExplicitRequestPromptSections(
        "tests/explicit-skill-requests/plan-prompts.md",
        content,
      ),
    ).toThrow();
  });

  test("rejects distinct scenario suites when three declared scenarios collapse onto only two sections", () => {
    const sections = ["scenario alpha beta", "scenario gamma"];

    const scenarios = [[/alpha/], [/beta/], [/gamma/]] as const;

    expect(() => assertDistinctScenarioCoverage(sections, scenarios)).toThrow();
  });

  test("ships structured skill-triggering fixtures", async () => {
    for (const fixture of await fixturePaths("tests/skill-triggering")) {
      await expectPromptFixture(fixture, { requireStructuredPrompts: true });
    }
  });

  test("ships structured explicit skill-request fixtures", async () => {
    for (const fixture of await fixturePaths("tests/explicit-skill-requests")) {
      await expectPromptFixture(fixture, { requireStructuredPrompts: true });
    }
  });

  test("ships structured multi-turn workflow fixtures", async () => {
    for (const fixture of await fixturePaths("tests/multi-turn-workflows")) {
      await expectMultiTurnFixture(fixture);
    }
  });

  test("fixtures align with their declared skill or routing intent", async () => {
    for (const directory of [
      "tests/skill-triggering",
      "tests/explicit-skill-requests",
    ] as const) {
      for (const fixture of await fixturePaths(directory)) {
        const content = await readFixture(fixture);
        assertFixtureIntentAlignment(fixture, content);
      }
    }
  });

  test("bounded explicit skill-request fixtures keep each prompt explicitly requested", async () => {
    for (const fixture of EXPLICIT_PER_PROMPT_FIXTURES) {
      const content = await readFixture(fixture);
      assertExplicitRequestPromptSections(fixture, content);
    }
  });

  test("critical trigger fixtures declare the skill load in every expected behavior block", async () => {
    for (const [fixture, skillName] of Object.entries(SKILL_TRIGGER_LOAD_EXPECTATIONS)) {
      const content = await readFixture(fixture);

      for (const section of structuredPromptSections(content)) {
        expect(section.toLowerCase()).toContain(`- load ${skillName}`.toLowerCase());
      }
    }
  });

  test("critical trigger load guard covers final readiness review triggers", () => {
    expect(SKILL_TRIGGER_LOAD_EXPECTATIONS["tests/skill-triggering/review-final-prompts.md"]).toBe("`review-final`");
  });

  test("ships the bounded eval deepening fixtures for the current pressure-wave skills", async () => {
    for (const [fixture, requiredPhrases] of Object.entries(DEEPENED_FIXTURE_EXPECTATIONS)) {
      expect(await exists(fixture), `${fixture} should exist`).toBe(true);

      const content = await readFixture(fixture).then((value) => value.toLowerCase());
      for (const theme of requiredPhrases) {
        expectContainsAny(content, theme.map((phrase) => phrase.toLowerCase()));
      }
    }
  });

  test("new security and debugging fixtures cover distinct scenarios without collapsing into one repeated case", async () => {
    for (const [fixture, scenarios] of Object.entries(DISTINCT_SCENARIO_EXPECTATIONS)) {
      const content = await readFixture(fixture);
      const sections = fixture.includes("multi-turn-workflows")
        ? structuredSections(content, "Turn")
        : structuredSections(content, "Prompt");

      assertDistinctScenarioCoverage(sections, scenarios);
    }
  });

  test("pressure fixtures avoid brittle repo-internal jargon while keeping realistic phrasing", async () => {
    for (const [fixture, forbiddenPhrases] of Object.entries(AVOID_JARGON_PHRASES)) {
      const content = await readFixture(fixture).then((value) => value.toLowerCase());

      for (const phrase of forbiddenPhrases) {
        expect(content).not.toContain(phrase.toLowerCase());
      }
    }
  });

  test("multi-turn fixtures keep user turns explicit", async () => {
    for (const fixture of await fixturePaths("tests/multi-turn-workflows")) {
      const content = await readFixture(fixture);
      expect(content).toMatch(/User: ".+"/);
    }
  });

  test("ships deeper multi-turn workflow fixtures and stage order", async () => {
    for (const [fixture, requiredPhrases] of Object.entries(EXPECTED_MULTI_TURN_DEPTH)) {
      expect(await exists(fixture), `${fixture} should exist`).toBe(true);

      const content = await readFixture(fixture).then((value) => value.toLowerCase());
      for (const phrase of requiredPhrases) {
        expect(content).toContain(phrase.toLowerCase());
      }
    }
  });

  test("new bounded workflow fixtures preserve ordered stage progression with carried evidence", async () => {
    for (const [fixture, turnExpectations] of Object.entries(EXPECTED_MULTI_TURN_PROGRESSIONS)) {
      const content = await readFixture(fixture);
      assertTurnLevelProgression(content, turnExpectations);
    }
  });

  test("bounded workflow fixtures keep exactly one task chain when the scenario models one concrete path", async () => {
    for (const [fixture, taskId] of Object.entries(MULTI_TURN_SINGLE_TASK_CHAIN_FIXTURES)) {
      const content = await readFixture(fixture).then((value) => value.toLowerCase());
      assertSingleTaskChain(content, taskId);
    }
  });

  test("comparison matrix reflects deeper multi-turn workflow coverage honestly", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");

    for (const skill of [
      "using-agentic",
      "tdd",
      "verify",
      "gate",
      "pr",
      "release",
      "finishing-a-development-branch",
      "repo",
      "writing-skills",
        "plan",
        "executing-plans",
        "subagent-driven-development",
      "review-spec",
      "review-quality",
      "review-final",
      "review-security",
        "requesting-code-review",
        "receiving-code-review",
        "worktree",
        "systematic-debugging",
        "dispatching-parallel-agents",
      ] as const) {
      const row = getComparisonMatrixRow(content, skill);
      expect(row.toLowerCase()).toContain("multi-turn");
    }
  });

  test("comparison matrix next-file pointers stay truthful", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");
    const pointers = [...content.matchAll(/`([^`]+)` \|$/gm)].map((match) => match[1] ?? "");

    expect(pointers.length).toBeGreaterThan(0);

    for (const pointer of pointers) {
      const existsOnDisk = await exists(pointer);
      expect(existsOnDisk, `${pointer} should exist`).toBe(true);
    }
  });

  test("comparison matrix routes design to a real fixture with shipped depth", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");

    for (const [skill, expectedPath] of Object.entries(EXPECTED_MATRIX_FIXTURES)) {
      const row = getComparisonMatrixRow(content, skill);
      const columns = comparisonMatrixColumns(row);
      const packageDepth = columns[3]?.toLowerCase() ?? "";
      const evalCoverage = columns[4]?.toLowerCase() ?? "";
      const remainingGap = columns[5]?.toLowerCase() ?? "";

      expect(row).toContain(`\`${skill}\``);
      expect(row).toContain(`\`${expectedPath}\``);
      expect(packageDepth).toBe("partial");
      expect(evalCoverage).toBe("partial");
      expectContainsAll(remainingGap, ["browser", "coverage"]);
    }
  });

  test("comparison matrix rows for pressure-wave skills point to the refreshed explicit fixtures", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");

    for (const [skill, expectedPath] of Object.entries(EXPECTED_PRESSURE_MATRIX_FIXTURES)) {
      const row = getComparisonMatrixRow(content, skill).toLowerCase();
      expect(row).toContain(expectedPath.toLowerCase());
      expect(row).toContain("pressure");
      expect(row).toContain("explicit-request");
      expect(row).toContain("trigger");
    }
  });

  test("comparison matrix rows for intake skills preserve read-only routing coverage", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");

    const requirementsBriefRow = getComparisonMatrixRow(content, "requirements-brief").toLowerCase();
    expectContainsAll(requirementsBriefRow, [
      "read-only",
      "requirements brief",
      "requirements synthesis",
      "trigger",
      "explicit-request",
      "tests/explicit-skill-requests/requirements-brief-prompts.md",
    ]);

    const issueSlicingRow = getComparisonMatrixRow(content, "issue-slicing").toLowerCase();
    expectContainsAll(issueSlicingRow, [
      "read-only",
      "issue drafts",
      "vertical",
      "dependencies",
      "hitl",
      "afk",
      "trigger",
      "explicit-request",
      "tests/explicit-skill-requests/issue-slicing-prompts.md",
    ]);
  });

  test("comparison matrix rows for deeper review and debugging coverage stay honest", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");

    const reviewSecurityRow = getComparisonMatrixRow(content, "review-security").toLowerCase();
    expectContainsAll(reviewSecurityRow, ["trigger", "explicit-request", "severity"]);

    const systematicDebuggingRow = getComparisonMatrixRow(content, "systematic-debugging").toLowerCase();
    expectContainsAll(systematicDebuggingRow, ["trigger", "explicit-request", "multi-turn", "fix handoff"]);
  });

  test("comparison matrix rows for repo, adr, and commit reflect the stronger end-to-end workflow depth honestly", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");

    const repoRow = getComparisonMatrixRow(content, "repo").toLowerCase();
    expectContainsAll(repoRow, ["trigger", "explicit-request", "multi-turn", "repo -> scope -> verify"]);

    const adrRow = getComparisonMatrixRow(content, "adr").toLowerCase();
    expectContainsAll(adrRow, ["trigger", "explicit-request", "multi-turn", "adr -> implementation boundary"]);

    const commitRow = getComparisonMatrixRow(content, "commit").toLowerCase();
    expectContainsAll(commitRow, ["trigger", "explicit-request", "multi-turn", "commit after hooks and verification"]);

    const writingSkillsRow = getComparisonMatrixRow(content, "writing-skills").toLowerCase();
    expectContainsAll(writingSkillsRow, ["trigger", "explicit-request", "multi-turn", "validate", "fix"]);
    expect(writingSkillsRow).not.toContain("pressure");
  });

  test("comparison matrix rows for plan through verify mention the scaffolded executable review workflow", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");

    for (const skill of ["plan", "subagent-driven-development", "review-spec", "review-quality", "verify"] as const) {
      const row = getComparisonMatrixRow(content, skill).toLowerCase();
      expectContainsAll(row, ["multi-turn", "plan -> subagent-driven-development -> review-spec -> review-quality -> verify"]);
    }
  });

  test("comparison matrix reflects closed quality/delegation/coding-control gaps", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");

    const tddRow = getComparisonMatrixRow(content, "tdd").toLowerCase();
    expectContainsAll(tddRow, ["red-green-refactor", "bug-fix", "manual", "delete-and-restart"]);

    const receivingRow = getComparisonMatrixRow(content, "receiving-code-review").toLowerCase();
    expectContainsAll(receivingRow, ["external reviewer", "unclear feedback", "yagni", "github thread"]);

    const executingRow = getComparisonMatrixRow(content, "executing-plans").toLowerCase();
    expectContainsAll(executingRow, ["worktree", "isolation", "main/master"]);

    const reviewFinalRow = getComparisonMatrixRow(content, "review-final").toLowerCase();
    expectContainsAll(reviewFinalRow, ["final holistic", "integrated diff", "before release/pr"]);

    expect(content.toLowerCase()).toContain("qa/persona drift closed");
  });

  test("writing-skills docs avoid contradictory force-load links and keep deep testing guidance in the companion reference", async () => {
    const skill = await readFixture("skills/writing-skills/SKILL.md");
    const testingReference = await readFixture("skills/writing-skills/testing-skills-with-subagents.md");

    expect(skill).toContain("testing-skills-with-subagents.md");
    expect(skill).not.toContain("@testing-skills-with-subagents.md");
    expect(skill).not.toContain("@graphviz-conventions.dot");
    expect(skill).not.toContain("## Testing All Skill Types");
    expect(skill).not.toContain("## Common Rationalizations for Skipping Testing");

    expect(testingReference).toContain("## Testing All Skill Types");
    expect(testingReference).toContain("## Common Rationalizations for Skipping Testing");
    expect(testingReference).toContain("## RED-GREEN-REFACTOR for Skills");
  });

  test("commit skill docs cover hook retry no-bypass and pushed-history follow-up commit discipline", async () => {
    const skill = (await readFixture("skills/commit/SKILL.md")).toLowerCase();
    const template = (await readFixture("skills/commit/commit-message-template.md")).toLowerCase();
    const guide = (await readFixture("skills/commit/references/conventional-commit-guide.md")).toLowerCase();

    expectContainsAll(skill, ["restage", "retry the commit", "no-bypass", "pushed", "follow-up commit", "do not amend"]);
    expectContainsAll(template, ["type(scope): short imperative summary", "follow-up commit", "pushed history"]);
    expectContainsAll(guide, ["hook failure", "retry the commit", "no-bypass", "pushed", "follow-up commit"]);
  });

  test("design comparison matrix row mentions deeper package and bounded remaining gap", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");
    const row = getComparisonMatrixRow(content, "design");
    const columns = comparisonMatrixColumns(row);
    const remainingGap = (columns[5] ?? "").toLowerCase();

    expectContainsAll(remainingGap, ["direction", "browser", "gap"]);
  });

  test("worktree comparison matrix row reflects end-to-end merged cleanup support", async () => {
    const content = await readFixture("docs/skills-comparison-matrix.md");
    const row = getComparisonMatrixRow(content, "worktree").toLowerCase();

    expectContainsAll(row, ["end-to-end", "optional remote deletion", "merged-worktree cleanup"]);
  });
});
