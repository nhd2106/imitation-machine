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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillsDir = path.resolve(__dirname, "../../skills");
const agentsDir = path.resolve(__dirname, "../agents");
const pluginRoot = path.resolve(__dirname, "../..");
const cliPath = path.resolve(pluginRoot, "cli/index.ts");
const binDir = path.resolve(pluginRoot, "bin");
const WRITE_AUTHORIZING_SKILLS = new Set(["brainstorm", "plan", "tdd", "systematic-debugging"]);
const ACTIVATION_MARKERS = [
  ".imitation-machine-enabled",
  ".agentic",
];

/** @type {Map<string, Record<string, boolean>>} */
const policyStateStore = new Map();
const activationCache = new Map();
const projectSkillsCache = new Map();

const PACKAGED_AGENT_CONFIGS = {
  architect: { description: "Produces architecture guidance, module boundaries, and ADR-quality decisions before significant design changes", mode: "subagent", permission: { edit: "ask", bash: "deny", webfetch: "deny" } },
  po: { description: "Clarifies requirements, acceptance criteria, and scope before planning begins", mode: "subagent", permission: { edit: "ask", bash: "deny", webfetch: "deny" } },
  planner: { description: "Breaks an approved requirement or spec into atomic 2-5 minute executable tasks with exact file paths and verification", mode: "subagent", permission: { edit: "ask", bash: "deny", webfetch: "deny" } },
  worktree: { description: "Decides whether workspace isolation is needed and sets up or verifies a worktree before non-trivial implementation begins", mode: "subagent", permission: { edit: "deny", bash: "ask", webfetch: "deny" } },
  coder: { description: "Implements one approved task with strict TDD, bounded file scope, and explicit status reporting", mode: "subagent", permission: { edit: "allow", bash: "ask", webfetch: "deny" } },
  qa: { description: "Reviews test strategy, edge cases, and coverage gaps for a bounded change without editing code", mode: "subagent", permission: { edit: "deny", bash: "ask", webfetch: "deny" } },
  security: { description: "Performs read-only security review for auth, input handling, secrets, unsafe execution paths, and boundary risks", mode: "subagent", permission: { edit: "deny", bash: "ask", webfetch: "deny" } },
  "reviewer-spec": { description: "Checks whether implementation matches the task spec exactly before quality review begins", mode: "subagent", permission: { edit: "deny", bash: "deny", webfetch: "deny" } },
  "reviewer-quality": { description: "Assesses readability, maintainability, and repo fit after spec review passes", mode: "subagent", permission: { edit: "deny", bash: "deny", webfetch: "deny" } },
  docs: { description: "Updates documentation, READMEs, and usage notes for completed changes without drifting into unrelated docs work", mode: "subagent", permission: { edit: "allow", bash: "deny", webfetch: "deny" } },
  release: { description: "Prepares verified work for PR or release by checking gates, traceability, versioning intent, and changelog clarity", mode: "subagent", permission: { edit: "ask", bash: "ask", webfetch: "deny" } },
};

function buildBootstrap(projectSkills = []) {
  const projectSkillsSection = projectSkills.length > 0
    ? [
        "",
        "## Project-Local Skills (MANDATORY)",
        "",
        "This project has custom skills. You and your subagents MUST load and follow these skills when they are relevant to the task:",
        "",
        ...projectSkills.map((s) => `- \`${s.name}\`: ${s.description || "(load to see details)"}`),
        "",
        "When dispatching @coder, @planner, @architect, @qa, or @reviewer-quality, include the relevant project skill names in the task prompt so the subagent loads them before working.",
      ]
    : [];

  return [
    "<EXTREMELY_IMPORTANT>",
    "You have Imitation Machine workflow skills installed.",
    "",
    "## YOU ARE AN ORCHESTRATOR, NOT AN IMPLEMENTER",
    "",
    "Your job is to delegate work to specialized subagents. Do NOT implement, edit files, or run tests yourself unless the task is a single tiny step.",
    "",
    "## Mandatory Delegation Rules",
    "",
    "- Multi-step work → dispatch @planner to decompose into tasks first.",
    "- Stubborn failure or unclear regression → load `systematic-debugging` before changing code.",
    "- If the plan identifies independent planned task groups, fan out to multiple branches/worktrees/coders in parallel; shared groups stay together in one delivery lane.",
    "- Implementation work → dispatch @worktree for isolation, then @coder to implement ONE task at a time.",
    "- Independent checks or research threads → load `dispatching-parallel-agents` before fanning out work.",
    "- After each @coder task → dispatch @reviewer-spec, then @reviewer-quality.",
    "- Review feedback to process → load `receiving-code-review` before replying or patching.",
    "- Risk-sensitive changes → dispatch @security.",
    "- Test gaps → dispatch @qa.",
    "- Docs updates → dispatch @docs.",
    "- PR/release → dispatch @release.",
    "- Branch handoff or final cleanup → load `finishing-a-development-branch` before calling it ready.",
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
    "1. Load a process skill: brainstorm/plan/tdd for implementation, systematic-debugging for debugging, dispatching-parallel-agents for safe parallel fanout, or review-spec/review-quality/review-security/receiving-code-review for review work.",
    "2. When delegating to subagents, tell them: \"Load the skill tool with <skill-name> before starting.\"",
    "3. Let @planner classify independence / grouping before choosing one lane or many lanes.",
    "4. Delegate each independent lane to its own @worktree + @coder flow, while shared groups stay together.",
    "5. Completion requires fresh evidence from `agentic verify all`.",
    `6. If \`agentic\` is unavailable: bun \"${cliPath}\" <command>.`,
    "",
    "Available subagents: @po, @planner, @worktree, @architect, @coder, @reviewer-spec, @reviewer-quality, @security, @qa, @docs, @release.",
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

function enforceToolPolicy(input, output) {
  if (!shouldActivate(input, output)) return;

  const tool = input?.tool;
  if (!tool) return;

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

  // After usingLoaded: if no workflow skill yet, only block edit/write
  if (!state.workflowLoaded) {
    if (tool === "edit" || tool === "write") {
        throw new Error(
          "Policy blocked: load an implementation workflow skill before writing files. Examples: brainstorm/plan/tdd/systematic-debugging.",
        );
    }
    return;
  }

  // Reliability guard: inject stable runtime aliases and path for every bash execution.
  if (tool === "bash") {
    const args = output?.args;
    const command = args?.command;
    if (typeof command !== "string") return;

    const normalized = command.replace(/\bbun\s+cli\/index\.ts\b/g, "bun \"$AGENTIC_CLI_PATH\"");
    const resolver = [
      `export AGENTIC_PLUGIN_ROOT=\"${pluginRoot}\"`,
      `export AGENTIC_CLI_PATH=\"${cliPath}\"`,
      `export PATH=\"${binDir}:$PATH\"`,
      `if ! command -v agentic >/dev/null 2>&1; then agentic() { bun \"$AGENTIC_CLI_PATH\" \"$@\"; }; fi`,
    ].join("; ");

    args.command = `${resolver}; ${normalized}`;
  }
}

const ImitationMachinePlugin = async () => {
  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir);
      }

      config.agent = config.agent || {};
      for (const [agentName, agentConfig] of Object.entries(PACKAGED_AGENT_CONFIGS)) {
        const existingAgentConfig = config.agent[agentName] || {};
        config.agent[agentName] = {
          ...agentConfig,
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
      const bootstrap = buildBootstrap(projectSkills);
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
      enforceToolPolicy(input, output);
    },
  };
};

export default ImitationMachinePlugin;
