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
const WRITE_AUTHORIZING_SKILLS = new Set(["brainstorm", "plan", "executing-plans", "tdd", "systematic-debugging"]);
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
    "1. Load a process skill: brainstorm/plan/executing-plans/tdd for implementation, systematic-debugging for debugging, dispatching-parallel-agents for safe parallel fanout, review-spec/review-quality/review-security/requesting-code-review/receiving-code-review for review work, `pr` for PR creation/review-readiness, or `release` for release readiness/version/changelog/tag/publish.",
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
          "Policy blocked: load an implementation workflow skill before writing files. Examples: brainstorm/plan/executing-plans/tdd/systematic-debugging.",
        );
    }
    if (tool === "bash" && !modePolicy.allowBashWithoutWorkflowSkill) {
      throw new Error(
        "Policy blocked: load an implementation workflow skill before running bash in strict mode. Examples: brainstorm/plan/executing-plans/tdd/systematic-debugging.",
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
