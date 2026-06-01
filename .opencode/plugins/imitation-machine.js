/**
 * Imitation Machine plugin for OpenCode
 *
 * - Registers packaged enterprise skills automatically.
 * - Injects a bootstrap reminder on first user message in opted-in repos.
 * - Auto-activates workflow state so tool calls are not blocked on startup.
 * - Enforces subagent delegation for multi-step work.
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { describeModeSource, getModePolicy, getRelevantModePath, resolveProjectMode } from "../../cli/mode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillsDir = path.resolve(__dirname, "../../skills");
const agentsDir = path.resolve(__dirname, "../agents");
const pluginRoot = path.resolve(__dirname, "../..");
const cliPath = path.resolve(pluginRoot, "cli/index.ts");
const binDir = path.resolve(pluginRoot, "bin");
const WRITE_AUTHORIZING_SKILLS = new Set(["brainstorm", "plan", "executing-plans", "tdd", "systematic-debugging", "prototype"]);
const ACTIVATION_MARKERS = [
  ".imitation-machine-enabled",
  ".agentic",
];

/** @type {Map<string, Record<string, boolean>>} */
const policyStateStore = new Map();
const activationCache = new Map();
const projectSkillsCache = new Map();

const PACKAGED_AGENT_CONFIGS = {
  architect: { mode: "subagent", permission: { edit: "ask", bash: "deny", webfetch: "deny" } },
  po: { mode: "subagent", permission: { edit: "ask", bash: "deny", webfetch: "deny" } },
  planner: { mode: "subagent", permission: { edit: "ask", bash: "deny", webfetch: "deny" } },
  worktree: { mode: "subagent", permission: { edit: "deny", bash: "ask", webfetch: "deny" } },
  coder: { mode: "subagent", permission: { edit: "allow", bash: "ask", webfetch: "deny" } },
  qa: { mode: "subagent", permission: { edit: "deny", bash: "ask", webfetch: "deny" } },
  security: { mode: "subagent", permission: { edit: "deny", bash: "ask", webfetch: "deny" } },
  "reviewer-spec": { mode: "subagent", permission: { edit: "deny", bash: "deny", webfetch: "deny" } },
  "reviewer-quality": { mode: "subagent", permission: { edit: "deny", bash: "deny", webfetch: "deny" } },
  "reviewer-final": { mode: "subagent", permission: { edit: "deny", bash: "deny", webfetch: "deny" } },
  docs: { mode: "subagent", permission: { edit: "allow", bash: "deny", webfetch: "deny" } },
  release: { mode: "subagent", permission: { edit: "ask", bash: "ask", webfetch: "deny" } },
};

function buildBootstrap(modeResolution, projectSkills = []) {
  const modePolicy = getModePolicy(modeResolution.mode);
  const sourceDescription = describeModeSource(modeResolution);
  const relevantPath = getRelevantModePath(modeResolution);
  const projectSkillsSection = projectSkills.length > 0
    ? [
        "",
        "## Project-Local Skills (MANDATORY)",
        "",
        "This project has custom skills. You and your subagents MUST load and follow these skills when they are relevant to the task:",
        "",
        ...projectSkills.map((s) => `- \`${s.name}\`: ${s.description || "(load to see details)"}`),
        "",
        "When dispatching @coder, @planner, @architect, @reviewer-spec, @reviewer-quality, @reviewer-final, @security, @qa, or @docs, include the relevant project skill names in the task prompt so the subagent loads them before working.",
      ]
    : [];

  return [
    "<EXTREMELY_IMPORTANT>",
    "You have Imitation Machine workflow skills installed.",
    "",
    "## Resolved Policy Mode",
    `Resolved mode: ${modeResolution.mode}`,
    `Source: ${sourceDescription}`,
    `Relevant path: ${relevantPath}`,
    modePolicy.summary,
    "Tip: run `agentic mode show` for the full precedence explanation and revert/change commands.",
    "",
    "## YOU ARE AN ORCHESTRATOR, NOT AN IMPLEMENTER",
    "",
    "Your job is to delegate work to specialized subagents. Do NOT implement, edit files, or run tests yourself unless the task is a single tiny step.",
    "",
    "## Mandatory Delegation Rules",
    "",
    "- Vague request / missing acceptance criteria / unclear scope → dispatch @po.",
    "- Multi-step work → dispatch @planner to decompose into tasks first.",
    "- Approved plan, direct in-session execution → load `executing-plans` before implementing planned tasks inline.",
    "- Stubborn failure or unclear regression → load `systematic-debugging` before changing code.",
    "- If the plan identifies independent planned task groups, fan out to multiple branches/worktrees/coders in parallel; shared groups stay together in one delivery lane.",
    "- Implementation work → dispatch @worktree for isolation, then @coder to implement ONE task at a time.",
    "- Independent checks or research threads → load `dispatching-parallel-agents` before fanning out work.",
    "- Canonical delivery sequence: @coder → @reviewer-spec → @reviewer-quality → @security / @qa / @docs as needed → fresh verification → @reviewer-final → `pr` for PR readiness or @release for release packaging / handoff.",
    "- After each @coder task → dispatch @reviewer-spec, then @reviewer-quality before any final review.",
    "- After task-level reviews, gather specialized evidence with @security, @qa, and/or @docs as relevant before fresh verification.",
    "- After specialized evidence and fresh verification, dispatch @reviewer-final for final holistic production-readiness before `pr` PR readiness or @release release packaging / handoff.",
    "- Verified work that needs outside eyes → load `requesting-code-review` before asking for review or opening the PR ask.",
    "- Review feedback to process → load `receiving-code-review` before replying or patching.",
    "- Risk-sensitive changes → dispatch @security.",
    "- Test gaps → dispatch @qa.",
    "- Docs updates → dispatch @docs.",
    "- PR creation/review-readiness → load `pr`; release readiness/version/changelog/tag/publish → coordinate with @release / `release`.",
    "- Branch handoff or final cleanup → load `finishing-a-development-branch` before calling it ready.",
    "- User explicitly asks to be grilled, stress-test an idea, or challenge assumptions → load `grill-me` for adversarial clarification and stress testing before commitment.",
    "- Architecture deepening before refactor planning → load `architecture-deepening` for read-only candidate discovery; it does not authorize implementation and hands off to adr/plan/tdd.",
    "- Requirement unclear → dispatch @po to clarify.",
    "- Architecture decision → dispatch @architect.",
    "",
    "## Anti-Pattern: DO NOT",
    "",
    "- Plan inline, code inline, review inline as one continuous pass.",
    "- Skip @coder and edit files yourself for non-trivial changes.",
    "- Skip @worktree before dispatching @coder for non-trivial implementation.",
    "- Perform Stage 1 or Stage 2 review inline if @reviewer-spec or @reviewer-quality are available.",
    "- Work on multiple tasks sequentially without delegating each to @coder.",
    "- Dispatch subagents without telling them which project skills to load.",
    "",
    "## Inline Execution Allowed Only For",
    "",
    "- Tiny one-step edits (single file, <10 lines).",
    "- Read-only checks and exploration.",
    "- User explicitly forbids delegation.",
    "",
    "## Required Workflow",
    "",
    "1. Load a process skill: brainstorm/plan/executing-plans/tdd for implementation, prototype for approved disposable prototype work, architecture-deepening for read-only candidate discovery before plan/tdd, systematic-debugging for debugging, dispatching-parallel-agents for safe parallel fanout, grill-me for adversarial clarification/stress testing, review-spec/review-quality/review-security/requesting-code-review/receiving-code-review for review work, `pr` for PR creation/review-readiness, or `release` for release readiness/version/changelog/tag/publish.",
    "2. When delegating to subagents, tell them: \"Load the skill tool with <skill-name> before starting.\"",
    "3. Let @planner classify independence / grouping before choosing one lane or many lanes.",
    "4. Delegate each independent lane to its own @worktree + @coder flow, while shared groups stay together.",
    "5. Completion requires fresh verification evidence from `agentic verify all` before @reviewer-final, then `pr` PR readiness, @release release packaging, or handoff after @reviewer-final.",
    `6. If \`agentic\` is unavailable: bun \"${cliPath}\" <command>.`,
    "",
    "Available subagents: @po, @planner, @worktree, @architect, @coder, @reviewer-spec, @reviewer-quality, @reviewer-final, @security, @qa, @docs, @release.",
    ...projectSkillsSection,
    "</EXTREMELY_IMPORTANT>",
  ].join("\n");
}

function getProjectRoot(input, output) {
  return (
    input?.cwd
    ?? output?.args?.cwd
    ?? input?.session?.cwd
    ?? process.cwd()
  );
}

function loadAgentPrompt(agentName) {
  try {
    const content = fs.readFileSync(path.join(agentsDir, `${agentName}.md`), "utf8");
    const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n?/);
    return frontmatterMatch ? content.slice(frontmatterMatch[0].length).trim() : content.trim();
  } catch {
    return "";
  }
}

function loadAgentFrontmatter(agentName) {
  try {
    const content = fs.readFileSync(path.join(agentsDir, `${agentName}.md`), "utf8");
    return parseFrontmatter(content);
  } catch {
    return {};
  }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return {};

  const fields = {};
  for (const line of match[1].split("\n")) {
    const kvMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kvMatch) continue;
    fields[kvMatch[1]] = kvMatch[2].trim();
  }

  return fields;
}

/**
 * Discover project-local skills by scanning for SKILL.md files.
 * Checks both .opencode/skills/ and skills/ directories in the project root.
 * Returns array of { name, description } objects.
 */
function discoverProjectSkills(projectRoot) {
  if (projectSkillsCache.has(projectRoot)) {
    return projectSkillsCache.get(projectRoot);
  }

  const skills = [];
  const searchDirs = [
    path.join(projectRoot, ".opencode", "skills"),
    path.join(projectRoot, "skills"),
  ];

  for (const dir of searchDirs) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillFile = path.join(dir, entry.name, "SKILL.md");
      try {
        const content = fs.readFileSync(skillFile, "utf8");
        const frontmatter = parseFrontmatter(content);
        const name = String(frontmatter.name || entry.name).trim();
        const desc = String(frontmatter.description || "").trim();
        skills.push({ name, description: desc, dir: path.join(dir, entry.name) });
      } catch {
        // SKILL.md doesn't exist, skip
      }
    }
  }

  projectSkillsCache.set(projectRoot, skills);
  return skills;
}

function shouldActivate(input, output) {
  if (process.env["IMITATION_FORCE"] === "1") return true;

  const root = getProjectRoot(input, output);
  if (activationCache.has(root)) {
    return activationCache.get(root);
  }

  const active = ACTIVATION_MARKERS.some((marker) => fs.existsSync(path.join(root, marker)));

  activationCache.set(root, active);
  return active;
}

function getRawSessionID(input) {
  return (
    input?.sessionID
    ?? input?.sessionId
    ?? input?.session?.id
    ?? input?.message?.sessionID
    ?? "global"
  );
}

function getSessionKey(input, output) {
  return `session:${getProjectRoot(input, output)}:${getRawSessionID(input)}`;
}

function getProjectKey(input, output) {
  return `project:${getProjectRoot(input, output)}`;
}

function createProjectState() {
  return {
    usingLoaded: false,
    workflowLoaded: false,
  };
}

function createSessionState() {
  return {
    bootstrapInjected: false,
  };
}

function getState(input, output) {
  const sessionKey = getSessionKey(input, output);
  const projectKey = getProjectKey(input, output);

  const sessionEntry = policyStateStore.get(sessionKey) || createSessionState();
  const projectEntry = policyStateStore.get(projectKey) || createProjectState();

  const state = {
    usingLoaded: Boolean(projectEntry.usingLoaded),
    workflowLoaded: Boolean(projectEntry.workflowLoaded),
    bootstrapInjected: Boolean(sessionEntry.bootstrapInjected),
  };

  policyStateStore.set(sessionKey, { ...sessionEntry });
  policyStateStore.set(projectKey, { ...projectEntry });

  return { sessionKey, projectKey, state };
}

function updateState(input, output, mutator) {
  const { sessionKey, projectKey, state } = getState(input, output);
  mutator(state);
  policyStateStore.set(sessionKey, { bootstrapInjected: state.bootstrapInjected });
  policyStateStore.set(projectKey, {
    usingLoaded: state.usingLoaded,
    workflowLoaded: state.workflowLoaded,
  });
}

function extractSkillName(input, output) {
  return (
    output?.args?.name
    ?? input?.args?.name
    ?? output?.name
    ?? input?.name
    ?? ""
  );
}

function shellTokens(segment) {
  return Array.from(segment.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g), (match) => match[1] ?? match[2] ?? match[3]);
}

function shortOptionLetters(token) {
  if (!/^-[A-Za-z]+$/.test(token) || token.startsWith("--")) return [];
  return token.slice(1).split("");
}

function hasShortOption(args, option) {
  return args.some((arg) => shortOptionLetters(arg).includes(option));
}

function hasLongOption(args, option) {
  return args.some((arg) => arg === option || arg.startsWith(`${option}=`));
}

function hasAnyOption(args, { short = [], long = [] }) {
  return short.some((option) => hasShortOption(args, option))
    || long.some((option) => hasLongOption(args, option));
}

function normalizeShellToken(token) {
  const normalized = token.replace(/^[({]+/, "").replace(/[)}]+$/, "");
  return /^[A-Za-z_][A-Za-z0-9_]*\($/.test(normalized) ? "__function_decl__" : normalized;
}

function skipCommandOptions(tokens, index) {
  let cursor = index;
  while (tokens[cursor] === "-p" || tokens[cursor] === "-v" || tokens[cursor] === "-V") {
    cursor += 1;
  }
  if (tokens[cursor] === "--") {
    cursor += 1;
  }
  return cursor;
}

function skipEnvOptions(tokens, index) {
  let cursor = index;
  while (cursor < tokens.length) {
    if (tokens[cursor] === "-i" || tokens[cursor] === "-0" || tokens[cursor] === "--ignore-environment") {
      cursor += 1;
      continue;
    }
    if (tokens[cursor] === "--") {
      cursor += 1;
      break;
    }
    if (tokens[cursor] === "-u" || tokens[cursor] === "-C") {
      cursor += 2;
      continue;
    }
    if (tokens[cursor].startsWith("--unset=") || tokens[cursor].startsWith("--chdir=")) {
      cursor += 1;
      continue;
    }
    if (tokens[cursor] === "--unset" || tokens[cursor] === "--chdir") {
      cursor += 2;
      continue;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=.*$/.test(tokens[cursor])) {
      cursor += 1;
      continue;
    }
    break;
  }
  return cursor;
}

function skipSudoOptions(tokens, index) {
  let cursor = index;
  while (cursor < tokens.length) {
    const token = tokens[cursor];
    if (token === "-n" || token === "-E" || token === "-H" || token === "-S" || token === "-b" || token === "--non-interactive") {
      cursor += 1;
      continue;
    }
    if (token === "--") {
      cursor += 1;
      break;
    }
    if (token === "-u" || token === "-g" || token === "-h" || token === "--user" || token === "--group" || token === "--host") {
      cursor += 2;
      continue;
    }
    if (token.startsWith("-u") && token.length > 2) {
      cursor += 1;
      continue;
    }
    if (token.startsWith("--user=") || token.startsWith("--group=") || token.startsWith("--host=")) {
      cursor += 1;
      continue;
    }
    break;
  }
  return cursor;
}

function findGitIndex(tokens) {
  const commandPrefixes = new Set(["sudo", "then", "else", "do"]);

  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === "git") return index;
    if (token === "rtk" && tokens[index + 1] === "git") return index + 1;

    if (token === "command") {
      index = skipCommandOptions(tokens, index + 1);
      continue;
    }

    if (token === "env") {
      index = skipEnvOptions(tokens, index + 1);
      continue;
    }

    if (token === "sudo") {
      index = skipSudoOptions(tokens, index + 1);
      continue;
    }

    const mayContinue = commandPrefixes.has(token)
      || token === "__function_decl__"
      || /^[A-Za-z_][A-Za-z0-9_]*=.*$/.test(token);
    if (!mayContinue) return -1;
    index += 1;
  }

  return -1;
}

function skipCommandAndEnvWrappers(tokens) {
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];

    if (token === "sudo") {
      index = skipSudoOptions(tokens, index + 1);
      continue;
    }

    if (token === "command") {
      index = skipCommandOptions(tokens, index + 1);
      continue;
    }

    if (token === "env") {
      index = skipEnvOptions(tokens, index + 1);
      continue;
    }

    break;
  }

  return tokens.slice(index);
}

function parseGitAlias(configValue) {
  const match = configValue.match(/^alias\.([^=]+)=(.+)$/);
  if (!match) return null;

  return {
    name: match[1],
    command: match[2].replace(/^['"]|['"]$/g, ""),
  };
}

function collectGitConfigValue(tokens, startIndex) {
  const parts = [tokens[startIndex] ?? ""];
  let index = startIndex;
  const hasUnclosedQuote = () => {
    const value = parts.join(" ");
    return (value.match(/"/g)?.length ?? 0) % 2 === 1
      || (value.match(/'/g)?.length ?? 0) % 2 === 1;
  };

  while (index + 1 < tokens.length && hasUnclosedQuote()) {
    index += 1;
    parts.push(tokens[index]);
  }

  return {
    value: parts.join(" "),
    nextIndex: index + 1,
  };
}

function aliasCommandToGitCommand(command) {
  const isShellAlias = command.trim().startsWith("!");
  const normalized = command.trim().replace(/^!\s*/, "");
  if (isShellAlias) {
    const shellMatch = normalized.match(/^(?:sh|bash|zsh)\s+-[A-Za-z]*c[A-Za-z]*\s+(.+)$/);
    return shellMatch ? shellMatch[1].replace(/^['"]|['"]$/g, "") : normalized;
  }
  return normalized.startsWith("git ") ? normalized : `git ${normalized}`;
}

function extractNestedShellCommand(tokens) {
  const normalizedTokens = skipCommandAndEnvWrappers(tokens.map(normalizeShellToken).filter(Boolean));
  const shell = normalizedTokens[0];
  if (shell !== "sh" && shell !== "bash" && shell !== "zsh") return null;

  for (let index = 1; index < normalizedTokens.length; index += 1) {
    const token = normalizedTokens[index];
    if (/^-[A-Za-z]*c[A-Za-z]*$/.test(token)) {
      return normalizedTokens[index + 1] ?? null;
    }
  }

  return null;
}

function normalizeGitInvocation(tokens) {
  const normalizedTokens = tokens.map(normalizeShellToken).filter(Boolean);
  const gitIndex = findGitIndex(normalizedTokens);
  if (gitIndex < 0) return null;

  let index = gitIndex + 1;
  const aliases = new Map();
  while (index < normalizedTokens.length) {
    const token = normalizedTokens[index];
    if (token === "-C" || token === "-c" || token === "--git-dir" || token === "--work-tree" || token === "--namespace") {
      if (token === "-c") {
        const configValue = collectGitConfigValue(normalizedTokens, index + 1);
        const alias = parseGitAlias(configValue.value);
        if (alias) aliases.set(alias.name, alias.command);
        index = configValue.nextIndex;
        continue;
      }
      index += 2;
      continue;
    }
    if (token.startsWith("-C") && token.length > 2) {
      index += 1;
      continue;
    }
    if (token.startsWith("--git-dir=") || token.startsWith("--work-tree=") || token.startsWith("--namespace=")) {
      index += 1;
      continue;
    }
    if (token === "--no-pager" || token === "--paginate" || token === "--bare") {
      index += 1;
      continue;
    }
    break;
  }

  const subcommand = normalizedTokens[index];
  if (!subcommand) return null;

  return {
    subcommand,
    args: normalizedTokens.slice(index + 1),
    aliases,
  };
}

const DANGEROUS_GIT_MATCHERS = [
  {
    subcommand: "reset",
    matches: (args) => args.includes("--hard"),
  },
  {
    subcommand: "clean",
    matches: (args) => hasAnyOption(args, { short: ["f"], long: ["--force"] })
      && !hasAnyOption(args, { short: ["n"], long: ["--dry-run"] }),
  },
  {
    subcommand: "branch",
    matches: (args) => hasShortOption(args, "D")
      || (hasAnyOption(args, { short: ["d"], long: ["--delete"] })
        && hasAnyOption(args, { short: ["f"], long: ["--force"] })),
  },
  {
    subcommand: "checkout",
    matches: (args) => args.some((arg) => arg === "." || arg === "./" || arg === ":/"),
  },
  {
    subcommand: "restore",
    matches: (args) => args.some((arg) => arg === "." || arg === "./" || arg === ":/"),
  },
  {
    subcommand: "push",
    matches: (args) => hasAnyOption(args, { short: ["f"], long: ["--force", "--force-with-lease", "--mirror"] })
      || args.some((arg) => arg.startsWith("+")),
  },
];

function findHeredocOpener(line) {
  let quote = null;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (char === "#") {
      return null;
    }

    if (char === "<" && line[index + 1] === "<") {
      let cursor = index + 2;
      if (line[cursor] === "-") {
        cursor += 1;
      }
      while (/\s/.test(line[cursor] ?? "")) {
        cursor += 1;
      }

      const delimiterQuote = line[cursor] === "'" || line[cursor] === '"' ? line[cursor] : null;
      const quoted = Boolean(delimiterQuote);
      if (delimiterQuote) {
        cursor += 1;
      }

      let delimiter = "";
      while (cursor < line.length) {
        const delimiterChar = line[cursor];
        if (delimiterQuote ? delimiterChar === delimiterQuote : /[\s;&|]/.test(delimiterChar)) {
          break;
        }
        delimiter += delimiterChar;
        cursor += 1;
      }

      return delimiter ? { delimiter, executable: !quoted } : null;
    }
  }

  return null;
}

function stripHeredocBodies(command) {
  const keptLines = [];
  const executableBodies = [];
  let heredocDelimiter = null;
  let heredocBody = [];
  let heredocExecutable = false;

  for (const line of command.split("\n")) {
    if (heredocDelimiter) {
      if (line.trim() === heredocDelimiter) {
        if (heredocExecutable) {
          executableBodies.push(heredocBody.join("\n"));
        }
        heredocDelimiter = null;
        heredocBody = [];
        heredocExecutable = false;
      } else {
        heredocBody.push(line);
      }
      continue;
    }

    keptLines.push(line);
    const heredocMatch = findHeredocOpener(line);
    if (heredocMatch) {
      heredocDelimiter = heredocMatch.delimiter;
      heredocExecutable = heredocMatch.executable;
      heredocBody = [];
    }
  }

  if (heredocDelimiter) {
    keptLines.push(...heredocBody);
  }

  return { command: keptLines.join("\n"), executableBodies };
}

function splitShellSegments(command) {
  const segments = [];
  let current = "";
  let quote = null;
  let escaped = false;

  const pushCurrent = () => {
    if (current.trim()) {
      segments.push(current);
    }
    current = "";
  };

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\" && quote !== "'") {
      current += char;
      escaped = true;
      continue;
    }

    if (quote) {
      current += char;
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      current += char;
      quote = char;
      continue;
    }

    if (char === ";" || char === "\n") {
      pushCurrent();
      continue;
    }

    if (char === "&" || char === "|") {
      pushCurrent();
      if (command[index + 1] === char) {
        index += 1;
      }
      continue;
    }

    current += char;
  }

  pushCurrent();
  return segments;
}

function findCommandSubstitutionEnd(command, startIndex, options = {}) {
  const ignoreQuotes = Boolean(options.ignoreQuotes);
  let depth = 1;
  let quote = null;
  let escaped = false;

  for (let index = startIndex; index < command.length; index += 1) {
    const char = command[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }

    if (!ignoreQuotes && quote) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (!ignoreQuotes && (char === "'" || char === '"')) {
      quote = char;
      continue;
    }

    if (char === "$" && command[index + 1] === "(") {
      depth += 1;
      index += 1;
      continue;
    }

    if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function extractCommandSubstitutionBodies(command, options = {}) {
  const ignoreQuotes = Boolean(options.ignoreQuotes);
  const bodies = [];
  let quote = null;
  let escaped = false;

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }

    if (!ignoreQuotes && quote === "'") {
      if (char === "'") {
        quote = null;
      }
      continue;
    }

    if (!ignoreQuotes && char === "'" && quote !== '"') {
      quote = "'";
      continue;
    }

    if (!ignoreQuotes && char === '"') {
      quote = quote === '"' ? null : '"';
      continue;
    }

    if (char === "$" && command[index + 1] === "(") {
      const endIndex = findCommandSubstitutionEnd(command, index + 2, { ignoreQuotes });
      if (endIndex >= 0) {
        bodies.push(command.slice(index + 2, endIndex));
        index = endIndex;
      }
      continue;
    }

    if (char === "`") {
      let body = "";
      for (let innerIndex = index + 1; innerIndex < command.length; innerIndex += 1) {
        const innerChar = command[innerIndex];
        if (innerChar === "\\" && innerIndex + 1 < command.length) {
          body += command[innerIndex + 1];
          innerIndex += 1;
          continue;
        }
        if (innerChar === "`") {
          bodies.push(body);
          index = innerIndex;
          break;
        }
        body += innerChar;
      }
    }
  }

  return bodies;
}

function isDangerousGitCommand(command) {
  const { command: commandWithoutHeredocs, executableBodies } = stripHeredocBodies(command);
  for (const body of executableBodies) {
    for (const substitutionBody of extractCommandSubstitutionBodies(body, { ignoreQuotes: true })) {
      if (isDangerousGitCommand(substitutionBody)) {
        return true;
      }
    }
  }

  for (const body of extractCommandSubstitutionBodies(commandWithoutHeredocs)) {
    if (isDangerousGitCommand(body)) {
      return true;
    }
  }

  for (const segment of splitShellSegments(commandWithoutHeredocs)) {
    const tokens = shellTokens(segment.trim());
    const nestedCommand = extractNestedShellCommand(tokens);
    if (nestedCommand && isDangerousGitCommand(nestedCommand)) {
      return true;
    }

    const invocation = normalizeGitInvocation(tokens);
    if (!invocation) continue;

    if (DANGEROUS_GIT_MATCHERS.some((matcher) => matcher.subcommand === invocation.subcommand && matcher.matches(invocation.args))) {
      return true;
    }
    const aliasCommand = invocation.aliases.get(invocation.subcommand);
    if (aliasCommand && isDangerousGitCommand(aliasCommandToGitCommand(aliasCommand))) {
      return true;
    }
  }

  return false;
}

function blockDangerousGitBashCommand(output) {
  const args = output?.args;
  const command = args?.command;
  if (typeof command !== "string") return false;

  if (isDangerousGitCommand(command)) {
    throw new Error("Dangerous git command blocked: use a non-destructive git command or ask for explicit human intervention.");
  }

  return true;
}

async function enforceToolPolicy(input, output) {
  if (!shouldActivate(input, output)) return;

  const tool = input?.tool;
  if (!tool) return;
  const projectRoot = getProjectRoot(input, output);
  const modeResolution = await resolveProjectMode({ projectRoot });
  const modePolicy = getModePolicy(modeResolution.mode);

  const { state } = getState(input, output);

  // Track skill loads to set workflowLoaded
  if (tool === "skill") {
    const skillName = String(extractSkillName(input, output)).trim();
    updateState(input, output, (nextState) => {
      if (skillName === "using-agentic") {
        nextState.usingLoaded = true;
      }
      if (WRITE_AUTHORIZING_SKILLS.has(skillName)) {
        nextState.workflowLoaded = true;
      }
    });
    return;
  }

  // Once usingLoaded is set (by bootstrap injection or skill tool), allow everything except:
  // - edit/write without a workflow skill loaded (safety net only)
  if (!state.usingLoaded) {
    // Before activation: allow read-only discovery and task delegation
    const isDiscoveryTool = tool === "read" || tool === "glob" || tool === "grep";
    const isDelegateTool = tool === "task" || tool === "todowrite";

    if (isDiscoveryTool || isDelegateTool || tool === "webfetch") {
      return;
    }

    throw new Error(
      "Policy blocked: invoke skill tool and load using-agentic first.",
    );
  }

  // After usingLoaded: mode-specific pre-workflow safeguards apply.
  if (!state.workflowLoaded) {
    if ((tool === "edit" || tool === "write") && !modePolicy.allowWriteWithoutWorkflowSkill) {
        throw new Error(
          "Policy blocked: load an implementation workflow skill, or `prototype` for approved disposable prototype work, before writing files. Examples: brainstorm/plan/executing-plans/tdd/systematic-debugging/prototype.",
        );
    }
    if (tool === "bash" && !modePolicy.allowBashWithoutWorkflowSkill) {
      throw new Error(
        "Policy blocked: load an implementation workflow skill, or `prototype` for approved disposable prototype work, before running bash in strict mode. Examples: brainstorm/plan/executing-plans/tdd/systematic-debugging/prototype.",
      );
    }
    if (tool === "bash") {
      blockDangerousGitBashCommand(output);
    }
    return;
  }

  // Reliability guard: inject stable runtime aliases and path for every bash execution.
  if (tool === "bash") {
    const args = output?.args;
    const command = args?.command;
    if (typeof command !== "string") return;

    blockDangerousGitBashCommand(output);

    const normalized = command.replace(/\bbun\s+cli\/index\.ts\b/g, "bun \"$AGENTIC_CLI_PATH\"");
    const resolver = [
      `export AGENTIC_PLUGIN_ROOT=\"${pluginRoot}\"`,
      `export AGENTIC_CLI_PATH=\"${cliPath}\"`,
      `export PATH=\"${binDir}:$PATH\"`,
      `if ! command -v agentic >/dev/null 2>&1; then agentic() { bun \"$AGENTIC_CLI_PATH\" \"$@\"; }; fi`,
    ].join("; ");

    const alreadyHasResolver = normalized.includes("AGENTIC_PLUGIN_ROOT=")
      && normalized.includes("AGENTIC_CLI_PATH=")
      && normalized.includes("if ! command -v agentic");

    args.command = alreadyHasResolver ? normalized : `${resolver}; ${normalized}`;
  }
}

const ImitationMachinePlugin = async () => {
  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      config.skills.paths = [skillsDir, ...config.skills.paths.filter((skillPath) => skillPath !== skillsDir)];

      config.agent = config.agent || {};
      for (const [agentName, agentConfig] of Object.entries(PACKAGED_AGENT_CONFIGS)) {
        const existingAgentConfig = config.agent[agentName] || {};
        const frontmatter = loadAgentFrontmatter(agentName);
        config.agent[agentName] = {
          ...agentConfig,
          description: String(frontmatter.description || "").trim(),
          prompt: loadAgentPrompt(agentName),
          ...existingAgentConfig,
          permission: {
            ...agentConfig.permission,
            ...(existingAgentConfig.permission || {}),
          },
        };
      }
    },

    "experimental.chat.messages.transform": async (input, output) => {
      if (!shouldActivate(input, output)) return;

      const projectRoot = getProjectRoot(input, output);
      const projectSkills = discoverProjectSkills(projectRoot);
      const modeResolution = await resolveProjectMode({ projectRoot });
      const bootstrap = buildBootstrap(modeResolution, projectSkills);
      if (!bootstrap || !output.messages.length) return;

      const { state } = getState(input, output);
      if (state.bootstrapInjected) return;

      const userMessages = output.messages.filter((message) => message.info.role === "user");
      const latestUser = userMessages[userMessages.length - 1];
      if (!latestUser || !latestUser.parts.length) return;

      const ref = latestUser.parts[0];
      latestUser.parts.unshift({ ...ref, type: "text", text: bootstrap });

      // Auto-activate workflow state: bootstrap injection implies using-agentic is loaded
      updateState(input, output, (nextState) => {
        nextState.bootstrapInjected = true;
        nextState.usingLoaded = true;
      });
    },

    "tool.execute.before": async (input, output) => {
      await enforceToolPolicy(input, output);
    },
  };
};

export default ImitationMachinePlugin;
