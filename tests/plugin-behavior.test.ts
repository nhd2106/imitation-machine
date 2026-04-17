import { beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error JS plugin module is loaded directly for behavior tests.
import ImitationMachinePlugin from "../.opencode/plugins/imitation-machine.js";

type MessagePart = { type: string; text: string };
type ChatMessage = { info: { role: string }; parts: MessagePart[] };

function userMessage(text: string): ChatMessage {
  return {
    info: { role: "user" },
    parts: [{ type: "text", text }],
  };
}

describe("imitation-machine plugin behavior", () => {
  const originalCwd = process.cwd();

  beforeEach(() => {
    delete process.env.IMITATION_BOOTSTRAP;
    delete process.env.IMITATION_FORCE;
    process.chdir(originalCwd);
  });

  async function makeProject(active = false): Promise<string> {
    const cwd = await mkdtemp(join(tmpdir(), "imitation-machine-plugin-"));
    await mkdir(join(cwd, ".opencode"), { recursive: true });
    if (active) {
      await writeFile(join(cwd, ".imitation-machine-enabled"), "\n");
    }
    return cwd;
  }

  test("stays passive in repos that did not opt in", async () => {
    const cwd = await makeProject(false);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { args: { command: "bun test" } };

    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "p1", tool: "bash", cwd }, output),
    ).resolves.toBeUndefined();
    expect(output.args.command).toBe("bun test");
  });

  test("blocks edit/write before bootstrap in opted-in repos", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "s1", tool: "edit", cwd }, { args: { filePath: "/tmp/test.ts" } }),
    ).rejects.toThrow("load using-agentic first");
  });

  test("blocks bash before bootstrap in opted-in repos", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "s1b", tool: "bash", cwd }, { args: { command: "bun test" } }),
    ).rejects.toThrow("load using-agentic first");
  });

  test("allows discovery reads of any file before skill load in opted-in repos", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "s-disc", tool: "read", cwd }, { args: { filePath: "/tmp/src/components/App.tsx" } }),
    ).resolves.toBeUndefined();

    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "s-disc", tool: "read", cwd }, { args: { filePath: "/tmp/docs/mvp-hardening-backlog.md" } }),
    ).resolves.toBeUndefined();

    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "s-disc", tool: "glob", cwd }, { args: { pattern: "src/**/*.tsx" } }),
    ).resolves.toBeUndefined();
  });

  test("allows task delegation before skill load in opted-in repos", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "s-task", tool: "task", cwd }, { args: { description: "explore", prompt: "look around", subagent_type: "explore" } }),
    ).resolves.toBeUndefined();
  });

  test("allows bash after bootstrap without any additional workflow skill", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    // Bootstrap sets usingLoaded
    const chatOutput = { messages: [userMessage("hello")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-bash", cwd }, chatOutput);

    // Now bash should be allowed even without workflow skill
    const bashOutput = { args: { command: "bun test" } };
    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "s-bash", tool: "bash", cwd }, bashOutput),
    ).resolves.toBeUndefined();
  });

  test("blocks edit before workflow skill after using-agentic in opted-in repos", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    // Simulate bootstrap injection which sets usingLoaded
    const chatOutput = { messages: [userMessage("hello")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s3", cwd }, chatOutput);

    // using-agentic loaded via bootstrap, but no workflow skill yet
    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "s3", tool: "edit", cwd }, { args: { filePath: "/tmp/test.ts" } }),
    ).rejects.toThrow("implementation workflow skill");
  });

  test("allows edit after using-agentic and workflow skill in opted-in repos", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    // Bootstrap sets usingLoaded
    const chatOutput = { messages: [userMessage("hello")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-edit", cwd }, chatOutput);

    // Load workflow skill
    await plugin["tool.execute.before"]?.({ sessionID: "s-edit", tool: "skill", cwd, args: { name: "tdd" } }, { args: { name: "tdd" } });

    // Now edit should be allowed
    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "s-edit", tool: "edit", cwd }, { args: { filePath: "/tmp/test.ts" } }),
    ).resolves.toBeUndefined();
  });

  test("does not unlock write access for workflow-recognized skills that are not write-authorizing", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    const bootstrapOutput = { messages: [userMessage("debug and finish this branch")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-new-skills", cwd }, bootstrapOutput);

    for (const skill of [
      "dispatching-parallel-agents",
      "finishing-a-development-branch",
      "receiving-code-review",
    ] as const) {
      await plugin["tool.execute.before"]?.(
        { sessionID: `s-${skill}`, tool: "skill", cwd, args: { name: skill } },
        { args: { name: skill } },
      );

      await expect(
        plugin["tool.execute.before"]?.(
          { sessionID: `s-${skill}`, tool: "edit", cwd },
          { args: { filePath: `/tmp/${skill}.md` } },
        ),
      ).rejects.toThrow("implementation workflow skill");
    }
  });

  test("keeps write access for core implementation workflow skills", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    const bootstrapOutput = { messages: [userMessage("implement and review this change")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-write-core", cwd }, bootstrapOutput);

    for (const skill of ["brainstorm", "plan", "executing-plans", "tdd", "systematic-debugging"] as const) {
      await plugin["tool.execute.before"]?.(
        { sessionID: `s-core-${skill}`, tool: "skill", cwd, args: { name: skill } },
        { args: { name: skill } },
      );

      await expect(
        plugin["tool.execute.before"]?.(
          { sessionID: `s-core-${skill}`, tool: "edit", cwd },
          { args: { filePath: `/tmp/${skill}.md` } },
        ),
      ).resolves.toBeUndefined();
    }
  });

  test("keeps read-only review skills from unlocking file writes", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    const bootstrapOutput = { messages: [userMessage("review this change")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-readonly-review", cwd }, bootstrapOutput);

    for (const skill of ["review-spec", "review-quality", "review-security"] as const) {
      await plugin["tool.execute.before"]?.(
        { sessionID: `s-review-${skill}`, tool: "skill", cwd, args: { name: skill } },
        { args: { name: skill } },
      );

      await expect(
        plugin["tool.execute.before"]?.(
          { sessionID: `s-review-${skill}`, tool: "edit", cwd },
          { args: { filePath: `/tmp/${skill}.md` } },
        ),
      ).rejects.toThrow("implementation workflow skill");
    }
  });

  test("rewrites bash commands after workflow skill loaded in opted-in repos", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { args: { command: "bun cli/index.ts verify all" } };

    // Bootstrap sets usingLoaded
    const chatOutput = { messages: [userMessage("hello")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s4", cwd }, chatOutput);

    // Load workflow skill
    await plugin["tool.execute.before"]?.({ sessionID: "s4", tool: "skill", cwd, args: { name: "tdd" } }, { args: { name: "tdd" } });

    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "s4", tool: "bash", cwd }, output),
    ).resolves.toBeUndefined();

    expect(output.args.command).toContain('export AGENTIC_CLI_PATH=');
    expect(output.args.command).toContain('bun "$AGENTIC_CLI_PATH" verify all');
  });

  test("injects bootstrap always in opted-in repos (no env var required)", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    // IMITATION_BOOTSTRAP is NOT set
    delete process.env.IMITATION_BOOTSTRAP;
    const plugin = await ImitationMachinePlugin();
    const output = { messages: [userMessage("hello")] };

    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-always", cwd }, output);
    const firstText = output.messages[0]?.parts[0]?.text ?? "";
    expect(firstText).toContain("You have Imitation Machine workflow skills installed.");
  });

  test("injects bootstrap only once per session in opted-in repos", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { messages: [userMessage("hello")] };

    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s5", cwd }, output);

    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s5", cwd }, output);
    const bootstrapCount = output.messages[0]?.parts.filter((part) => part.text.includes("EXTREMELY_IMPORTANT")).length;
    expect(bootstrapCount).toBe(1);
  });

  test("injects bootstrap once per session even in the same repo", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const firstOutput = { messages: [userMessage("hello from first session")] };
    const secondOutput = { messages: [userMessage("hello from second session")] };

    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s5-first", cwd }, firstOutput);
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s5-second", cwd }, secondOutput);

    expect(firstOutput.messages[0]?.parts[0]?.text ?? "").toContain("EXTREMELY_IMPORTANT");
    expect(secondOutput.messages[0]?.parts[0]?.text ?? "").toContain("EXTREMELY_IMPORTANT");
  });

  test("bootstrap mandates subagent delegation for multi-step work", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { messages: [userMessage("fix the bugs")] };

    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-mandate", cwd }, output);
    const bootstrapText = output.messages[0]?.parts[0]?.text ?? "";
    // Must contain delegation mandate (case-insensitive)
    const lower = bootstrapText.toLowerCase();
    expect(lower).toContain("orchestrat");
    // Must mention specific subagents
    expect(bootstrapText).toContain("@coder");
    expect(bootstrapText).toContain("@planner");
  });

  test("bootstrap references newly added workflow skills at natural decision points", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { messages: [userMessage("help me work through this branch")] };

    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-bootstrap-skills", cwd }, output);
    const bootstrapText = output.messages[0]?.parts[0]?.text ?? "";

    expect(bootstrapText).toContain("systematic-debugging");
    expect(bootstrapText).toContain("dispatching-parallel-agents");
    expect(bootstrapText).toContain("executing-plans");
    expect(bootstrapText).toContain("finishing-a-development-branch");
    expect(bootstrapText).toContain("requesting-code-review");
    expect(bootstrapText).toContain("receiving-code-review");
  });

  test("bootstrap explains multi-lane fanout for independent task groups", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { messages: [userMessage("build the feature")] };

    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-fanout", cwd }, output);
    const bootstrapText = output.messages[0]?.parts[0]?.text ?? "";

    expect(bootstrapText).toContain("independent planned task groups");
    expect(bootstrapText).toContain("multiple branches/worktrees/coders in parallel");
    expect(bootstrapText).toContain("shared groups stay together");
  });

  test("does not activate strict mode from project-local plugin config alone", async () => {
    const cwd = await makeProject(false);
    await writeFile(join(cwd, ".opencode", "opencode.json"), '{"plugin":["imitation-machine"]}\n');
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { args: { command: "bun test" } };

    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "s6", tool: "bash", cwd }, output),
    ).resolves.toBeUndefined();
    expect(output.args.command).toBe("bun test");
  });

  test("does not activate strict mode from a commented plugin reference", async () => {
    const cwd = await makeProject(false);
    await writeFile(join(cwd, ".opencode", "opencode.json"), '{\n  "plugin": [\n    // "imitation-machine"\n  ]\n}\n');
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { args: { command: "bun test" } };

    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "s7", tool: "bash", cwd }, output),
    ).resolves.toBeUndefined();
    expect(output.args.command).toBe("bun test");
  });

  test("preserves state across different session identifiers in the same project", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    // Bootstrap sets usingLoaded on first session
    const chatOutput = { messages: [userMessage("hello")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "skill-session", cwd }, chatOutput);

    // Load workflow skill
    await plugin["tool.execute.before"]?.(
      { sessionID: "skill-session", tool: "skill", cwd, args: { name: "plan" } },
      { args: { name: "plan" } },
    );

    const output = { args: { command: "bun test" } };
    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "different-tool-session", tool: "bash", cwd }, output),
    ).resolves.toBeUndefined();
  });

  test("does not leak session state across repos when session identifiers are reused", async () => {
    const firstCwd = await makeProject(true);
    const secondCwd = await makeProject(true);
    const plugin = await ImitationMachinePlugin();

    process.chdir(firstCwd);
    const firstChatOutput = { messages: [userMessage("hello")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "shared-session", cwd: firstCwd }, firstChatOutput);

    await plugin["tool.execute.before"]?.(
      { sessionID: "shared-session", tool: "skill", cwd: firstCwd, args: { name: "plan" } },
      { args: { name: "plan" } },
    );

    process.chdir(secondCwd);
    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "shared-session", tool: "bash", cwd: secondCwd }, { args: { command: "bun test" } }),
    ).rejects.toThrow("load using-agentic first");
  });

  test("bootstrap includes discovered project-local skills", async () => {
    const cwd = await makeProject(true);
    // Create a project-local skill
    await mkdir(join(cwd, ".opencode", "skills", "hono-patterns"), { recursive: true });
    await writeFile(
      join(cwd, ".opencode", "skills", "hono-patterns", "SKILL.md"),
      "---\nname: hono-patterns\ndescription: How we use Hono in this project\n---\n\n# Hono Patterns\n\nAlways use Hono middleware pattern.",
    );

    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { messages: [userMessage("build the API")] };

    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-proj-skills", cwd }, output);
    const bootstrapText = output.messages[0]?.parts[0]?.text ?? "";
    expect(bootstrapText).toContain("hono-patterns");
    expect(bootstrapText).toContain("How we use Hono in this project");
    expect(bootstrapText).toContain("Project-Local Skills");
  });

  test("bootstrap works without project-local skills", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { messages: [userMessage("hello")] };

    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-no-proj-skills", cwd }, output);
    const bootstrapText = output.messages[0]?.parts[0]?.text ?? "";
    // Should NOT contain project skills section
    expect(bootstrapText).not.toContain("Project-Local Skills");
    // But should still have the core bootstrap
    expect(bootstrapText).toContain("You have Imitation Machine workflow skills installed.");
  });

  test("coder agent prompt mentions project skills", async () => {
    const plugin = await ImitationMachinePlugin();
    const config = {} as {
      skills?: { paths?: string[] };
      agent?: Record<string, { prompt?: string }>;
    };

    await plugin.config?.(config);

    const coderPrompt = String(config.agent?.coder?.prompt ?? "");
    expect(coderPrompt).toContain("project skills");
    expect(coderPrompt).toContain("skill tool");

    const plannerPrompt = String(config.agent?.planner?.prompt ?? "");
    expect(plannerPrompt).toContain("project skill");

    const architectPrompt = String(config.agent?.architect?.prompt ?? "");
    expect(architectPrompt).toContain("project skill");
  });

  test("registers packaged persona agents in OpenCode config", async () => {
    const plugin = await ImitationMachinePlugin();
    const config = {} as {
      skills?: { paths?: string[] };
      agent?: Record<string, { mode?: string; prompt?: string }>;
    };

    await plugin.config?.(config);

    expect(config.skills?.paths?.length).toBeGreaterThan(0);
    expect(config.agent?.planner?.mode).toBe("subagent");
    expect(config.agent?.worktree?.mode).toBe("subagent");
    expect(config.agent?.coder?.mode).toBe("subagent");
    expect(config.agent?.["reviewer-spec"]?.mode).toBe("subagent");
    expect(config.agent?.["reviewer-quality"]?.mode).toBe("subagent");
    expect(config.agent?.security?.mode).toBe("subagent");
    expect(String(config.agent?.planner?.prompt ?? "")).toContain("You are the Planner agent.");
    expect(String(config.agent?.coder?.prompt ?? "")).toContain("You are the Coder agent.");
  });

  test("backfills packaged agent defaults into partial existing config", async () => {
    const plugin = await ImitationMachinePlugin();
    const config = {
      agent: {
        coder: {
          description: "custom coder description",
        },
      },
    } as {
      skills?: { paths?: string[] };
      agent?: Record<string, { description?: string; mode?: string; prompt?: string; permission?: Record<string, string> }>;
    };

    await plugin.config?.(config);

    expect(config.agent?.coder?.description).toBe("custom coder description");
    expect(config.agent?.coder?.mode).toBe("subagent");
    expect(String(config.agent?.coder?.prompt ?? "")).toContain("You are the Coder agent.");
    expect(config.agent?.coder?.permission).toEqual({ edit: "allow", bash: "ask", webfetch: "deny" });
  });
});
