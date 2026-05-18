import { beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ImitationMachinePlugin from "../.opencode/plugins/imitation-machine.js";

type MessagePart = { type: string; text: string };
type ChatMessage = { info: { role: string }; parts: MessagePart[] };

function userMessage(text: string): ChatMessage {
  return {
    info: { role: "user" },
    parts: [{ type: "text", text }],
  };
}

function expectOrdered(content: string, earlier: string, later: string): void {
  const earlierIndex = content.indexOf(earlier);
  const laterIndex = content.indexOf(later);

  expect(earlierIndex, `${earlier} should exist`).toBeGreaterThanOrEqual(0);
  expect(laterIndex, `${later} should exist`).toBeGreaterThanOrEqual(0);
  expect(earlierIndex, `${earlier} should appear before ${later}`).toBeLessThan(laterIndex);
}

function countOccurrences(content: string, needle: string): number {
  return content.split(needle).length - 1;
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

  test("standard mode bootstrap shows resolved mode and source", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { messages: [userMessage("hello")] };

    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-mode-show", cwd }, output);

    const bootstrapText = output.messages[0]?.parts[0]?.text ?? "";
    expect(bootstrapText).toContain("Resolved mode: standard");
    expect(bootstrapText).toContain("Source: built-in fallback (no override or valid repo config)");
    expect(bootstrapText).toContain("Tip: run `agentic mode show`");
  });

  test("bootstrap shows repo-config as the mode source", async () => {
    const cwd = await makeProject(true);
    await writeFile(join(cwd, ".imitation-machine.json"), JSON.stringify({ mode: "lite" }, null, 2));
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { messages: [userMessage("hello")] };

    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-mode-repo", cwd }, output);

    const bootstrapText = output.messages[0]?.parts[0]?.text ?? "";
    expect(bootstrapText).toContain("Resolved mode: lite");
    expect(bootstrapText).toContain("Source: repo config from .imitation-machine.json");
  });

  test("bootstrap shows override as the mode source", async () => {
    const cwd = await makeProject(true);
    const storePath = join(cwd, "mode-store.json");
    await writeFile(join(cwd, ".imitation-machine.json"), JSON.stringify({ mode: "lite" }, null, 2));
    await writeFile(storePath, JSON.stringify({ version: 1, overrides: { [cwd]: "strict" } }, null, 2));
    process.env.AGENTIC_MODE_STORE_PATH = storePath;
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { messages: [userMessage("hello")] };

    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-mode-override", cwd }, output);

    const bootstrapText = output.messages[0]?.parts[0]?.text ?? "";
    expect(bootstrapText).toContain("Resolved mode: strict");
    expect(bootstrapText).toContain("Source: per-project override from override store");
    expect(bootstrapText).toContain("agentic mode show");
  });

  test("lite mode allows direct small-task edits after bootstrap", async () => {
    const cwd = await makeProject(true);
    await writeFile(join(cwd, ".imitation-machine.json"), JSON.stringify({ mode: "lite" }, null, 2));
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    const chatOutput = { messages: [userMessage("hello")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-lite", cwd }, chatOutput);

    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "s-lite", tool: "edit", cwd }, { args: { filePath: "/tmp/test.ts" } }),
    ).resolves.toBeUndefined();
  });

  test("strict mode keeps bash blocked until a workflow skill is loaded", async () => {
    const cwd = await makeProject(true);
    await writeFile(join(cwd, ".imitation-machine.json"), JSON.stringify({ mode: "strict" }, null, 2));
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    const chatOutput = { messages: [userMessage("hello")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-strict", cwd }, chatOutput);

    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "s-strict", tool: "bash", cwd }, { args: { command: "bun test" } }),
    ).rejects.toThrow("workflow skill");
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
      "requirements-brief",
      "issue-slicing",
      "zoom-out",
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
    for (const skill of ["brainstorm", "plan", "executing-plans", "tdd", "systematic-debugging"] as const) {
      const cwd = await makeProject(true);
      process.chdir(cwd);
      const plugin = await ImitationMachinePlugin();
      const sessionID = `s-core-${skill}`;

      const bootstrapOutput = { messages: [userMessage("implement and review this change")] };
      await plugin["experimental.chat.messages.transform"]?.({ sessionID, cwd }, bootstrapOutput);

      await plugin["tool.execute.before"]?.(
        { sessionID, tool: "skill", cwd, args: { name: skill } },
        { args: { name: skill } },
      );

      await expect(
        plugin["tool.execute.before"]?.(
          { sessionID, tool: "edit", cwd },
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

    for (const skill of ["review-spec", "review-quality", "review-final", "review-security"] as const) {
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

  test("grill-me is advertised for adversarial clarification without unlocking writes", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    const bootstrapOutput = { messages: [userMessage("grill me before we commit to this feature")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-grill-me", cwd }, bootstrapOutput);

    await plugin["tool.execute.before"]?.(
      { sessionID: "s-grill-me", tool: "skill", cwd, args: { name: "grill-me" } },
      { args: { name: "grill-me" } },
    );

    await expect(
      plugin["tool.execute.before"]?.(
        { sessionID: "s-grill-me", tool: "edit", cwd },
        { args: { filePath: "/tmp/grill-me.md" } },
      ),
    ).rejects.toThrow("implementation workflow skill");

    const bootstrapText = bootstrapOutput.messages[0]?.parts[0]?.text ?? "";
    expect(bootstrapText).toContain("grill-me");
    expect(bootstrapText).toContain("adversarial clarification");
    expect(bootstrapText).toContain("stress testing");
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

  test("blocks dangerous git bash commands after workflow unlock before resolver injection", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    const chatOutput = { messages: [userMessage("hello")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-git-danger", cwd }, chatOutput);
    await plugin["tool.execute.before"]?.({ sessionID: "s-git-danger", tool: "skill", cwd, args: { name: "tdd" } }, { args: { name: "tdd" } });

    for (const { name, command } of [
      { name: "hard reset", command: "git reset --hard" },
      { name: "hard reset after git global -C", command: "git -C repo reset --hard" },
      { name: "clean short force", command: "git clean -f" },
      { name: "clean long force", command: "git clean --force" },
      { name: "clean combined force directory", command: "git clean -fd" },
      { name: "clean long force directory", command: "git clean --force -d" },
      { name: "branch shortcut force delete", command: "git branch -D old-branch" },
      { name: "branch combined force delete", command: "git branch -df old-branch" },
      { name: "branch long force delete", command: "git branch --delete --force old-branch" },
      { name: "checkout all paths", command: "git checkout ." },
      { name: "restore all paths", command: "git restore ." },
      { name: "restore repository root pathspec", command: "git restore :/" },
      { name: "restore current directory pathspec", command: "git restore ./" },
      { name: "checkout repository root pathspec", command: "git checkout -- :/" },
      { name: "force push long", command: "git push --force" },
      { name: "force push short", command: "git push -f origin main" },
      { name: "force push with lease", command: "git push --force-with-lease origin HEAD" },
      { name: "force push refspec", command: "git push origin +HEAD:main" },
      { name: "force push single-ref refspec", command: "git push origin +main" },
      { name: "mirror push", command: "git push --mirror origin" },
      { name: "rtk wrapped hard reset", command: "rtk git -C repo reset --hard" },
      { name: "multi-command semicolon hard reset", command: "git status; git reset --hard" },
      { name: "multi-command and hard reset", command: "git status && git reset --hard" },
      { name: "piped hard reset", command: "git status | git reset --hard" },
      { name: "background force push", command: "true & git push --force" },
      { name: "command-prefixed hard reset", command: "command git reset --hard" },
      { name: "grouped hard reset", command: "true && (git reset --hard)" },
      { name: "conditional hard reset", command: "if true; then git reset --hard; fi" },
      { name: "inline alias hard reset", command: "git -c alias.wipe=\"reset --hard\" wipe" },
      { name: "inline shell alias hard reset", command: "git -c alias.wipe=\"!git reset --hard\" wipe" },
      { name: "inline shell alias nested shell hard reset", command: "git -c alias.wipe=\"!sh -c 'git reset --hard'\" wipe" },
      { name: "inline shell alias function hard reset", command: "git -c alias.wipe=\"!f() { git reset --hard; }; f\" wipe" },
      { name: "command option-prefixed hard reset", command: "command -p git reset --hard" },
      { name: "env option-prefixed hard reset", command: "env -i git reset --hard" },
      { name: "sh nested hard reset", command: "sh -c 'git reset --hard'" },
      { name: "zsh nested hard reset", command: "zsh -c 'git reset --hard'" },
      { name: "bash nested force push", command: "bash -lc \"git push --force\"" },
      { name: "bash nested compound hard reset", command: "bash -lc 'cd repo && git reset --hard'" },
      { name: "sh nested semicolon hard reset", command: "sh -c 'git status; git reset --hard'" },
      { name: "zsh nested piped hard reset", command: "zsh -c 'git status | git reset --hard'" },
      { name: "bash nested newline hard reset", command: "bash -lc 'git status\ngit reset --hard'" },
      { name: "command-wrapped nested bash hard reset", command: "command bash -lc 'git reset --hard'" },
      { name: "env-wrapped nested bash force push", command: "env -i bash -lc 'git push --force'" },
      { name: "sudo-wrapped nested bash hard reset", command: "sudo bash -lc 'git reset --hard'" },
      { name: "sudo option-wrapped hard reset", command: "sudo -n git reset --hard" },
      { name: "sudo option-wrapped nested bash hard reset", command: "sudo -n bash -lc 'git reset --hard'" },
      { name: "env long ignore-environment hard reset", command: "env --ignore-environment git reset --hard" },
      { name: "env long ignore-environment nested bash hard reset", command: "env --ignore-environment bash -lc 'git reset --hard'" },
      { name: "command terminator hard reset", command: "command -- git reset --hard" },
      { name: "command terminator nested bash hard reset", command: "command -- bash -lc 'git reset --hard'" },
      { name: "sudo terminator hard reset", command: "sudo -- git reset --hard" },
      { name: "sudo terminator nested bash hard reset", command: "sudo -- bash -lc 'git reset --hard'" },
      { name: "sudo long non-interactive hard reset", command: "sudo --non-interactive git reset --hard" },
      { name: "sudo long non-interactive nested bash hard reset", command: "sudo --non-interactive bash -lc 'git reset --hard'" },
      { name: "env terminator hard reset", command: "env -- git reset --hard" },
      { name: "env terminator nested bash hard reset", command: "env -- bash -lc 'git reset --hard'" },
      { name: "else-prefixed hard reset", command: "else git reset --hard" },
      { name: "unquoted command substitution hard reset", command: "echo $(git reset --hard)" },
      { name: "double-quoted command substitution hard reset", command: "echo \"$(git reset --hard)\"" },
      { name: "double-quoted command substitution after literal single quote", command: "echo \"prefix ' $(git reset --hard)\"" },
      { name: "assignment command substitution hard reset", command: "x=$(git reset --hard)" },
      { name: "legacy command substitution hard reset", command: "echo `git reset --hard`" },
      { name: "unquoted heredoc command substitution hard reset", command: "cat <<EOF\n$(git reset --hard)\nEOF" },
      { name: "unquoted heredoc legacy substitution hard reset", command: "cat <<EOF\n`git reset --hard`\nEOF" },
      { name: "unquoted heredoc single-quoted command substitution hard reset", command: "cat <<EOF\n'$(git reset --hard)'\nEOF" },
      { name: "unquoted heredoc single-quoted legacy substitution hard reset", command: "cat <<EOF\n'`git reset --hard`'\nEOF" },
      { name: "quoted heredoc-looking text before hard reset", command: "echo \"<<EOF\"\ngit reset --hard\nEOF" },
      { name: "commented heredoc-looking text before hard reset", command: "# <<EOF\ngit reset --hard\nEOF" },
    ] as const) {
      const output = { args: { command } };

      await expect(
        plugin["tool.execute.before"]?.({ sessionID: "s-git-danger", tool: "bash", cwd }, output),
        `${name}: ${command}`,
      ).rejects.toThrow("Dangerous git command blocked");

      expect(output.args.command, `${name}: command should remain unmodified`).toBe(command);
      expect(output.args.command, `${name}: resolver should not be injected`).not.toContain("AGENTIC_PLUGIN_ROOT");
    }
  });

  test("allows non-destructive git bash commands after workflow unlock with resolver injection", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    const chatOutput = { messages: [userMessage("hello")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-git-allowed", cwd }, chatOutput);
    await plugin["tool.execute.before"]?.({ sessionID: "s-git-allowed", tool: "skill", cwd, args: { name: "tdd" } }, { args: { name: "tdd" } });

    for (const { name, command } of [
      { name: "status", command: "git status" },
      { name: "status after git global -C", command: "git -C repo status" },
      { name: "diff stat", command: "git diff --stat" },
      { name: "short log", command: "git log --oneline -1" },
      { name: "normal branch push", command: "git push origin HEAD:refs/heads/test-branch" },
      { name: "targeted restore", command: "git restore path/to/file" },
      { name: "branch checkout", command: "git checkout feature-branch" },
      { name: "clean short force dry run", command: "git clean -fn" },
      { name: "clean long force dry run", command: "git clean --force --dry-run" },
      { name: "clean combined dry run", command: "git clean -fdn" },
      { name: "clean long dry run", command: "git clean --force -d --dry-run" },
      { name: "rtk wrapped status", command: "rtk git -C repo status" },
      { name: "unquoted heredoc body mentions hard reset", command: "cat <<EOF\ngit reset --hard\nEOF" },
      { name: "heredoc body mentions hard reset", command: "cat <<'EOF' > script.sh\ngit reset --hard\nEOF" },
      { name: "quoted heredoc command substitution text", command: "cat <<'EOF'\n$(git reset --hard)\nEOF" },
      { name: "quoted heredoc single-quoted command substitution text", command: "cat <<'EOF'\n'$(git reset --hard)'\nEOF" },
      { name: "echo mentions hard reset", command: "echo git reset --hard" },
      { name: "echo option mentions hard reset", command: "echo -n git reset --hard" },
      { name: "double-quoted separator text", command: "echo \"x; git reset --hard;\"" },
      { name: "single-quoted and text", command: "printf 'git status && git reset --hard'" },
      { name: "double-quoted pipe text", command: "echo \"git status | git reset --hard\"" },
      { name: "single-quoted newline text", command: "printf 'git status\ngit reset --hard'" },
      { name: "single-quoted command substitution text", command: "echo '$(git reset --hard)'" },
    ] as const) {
      const output = { args: { command } };

      await expect(
        plugin["tool.execute.before"]?.({ sessionID: "s-git-allowed", tool: "bash", cwd }, output),
        `${name}: ${command}`,
      ).resolves.toBeUndefined();

      expect(output.args.command, `${name}: resolver should be injected`).toContain("AGENTIC_PLUGIN_ROOT");
      expect(output.args.command, `${name}: original command should be preserved`).toContain(command);
    }
  });

  test("blocks dangerous git bash commands after bootstrap before workflow when mode allows bash", async () => {
    for (const mode of ["standard", "lite"] as const) {
      const cwd = await makeProject(true);
      if (mode === "lite") {
        await writeFile(join(cwd, ".imitation-machine.json"), JSON.stringify({ mode }, null, 2));
      }
      process.chdir(cwd);
      const plugin = await ImitationMachinePlugin();

      const chatOutput = { messages: [userMessage("hello")] };
      await plugin["experimental.chat.messages.transform"]?.({ sessionID: `s-git-preworkflow-${mode}`, cwd }, chatOutput);

      const output = { args: { command: "git reset --hard" } };
      await expect(
        plugin["tool.execute.before"]?.({ sessionID: `s-git-preworkflow-${mode}`, tool: "bash", cwd }, output),
        `${mode}: dangerous git should be blocked before workflow skill when bash is otherwise allowed`,
      ).rejects.toThrow("Dangerous git command blocked");

      expect(output.args.command, `${mode}: command should remain unmodified`).toBe("git reset --hard");
    }
  });

  test("keeps strict-mode dangerous git bash commands blocked by workflow policy before workflow skill", async () => {
    const cwd = await makeProject(true);
    await writeFile(join(cwd, ".imitation-machine.json"), JSON.stringify({ mode: "strict" }, null, 2));
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();

    const chatOutput = { messages: [userMessage("hello")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-git-strict-preworkflow", cwd }, chatOutput);

    const output = { args: { command: "git reset --hard" } };
    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "s-git-strict-preworkflow", tool: "bash", cwd }, output),
    ).rejects.toThrow("workflow skill");

    expect(output.args.command).toBe("git reset --hard");
  });

  test("does not govern git bash commands in repos that did not opt in", async () => {
    const cwd = await makeProject(false);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { args: { command: "git reset --hard" } };

    await expect(
      plugin["tool.execute.before"]?.({ sessionID: "s-git-passive", tool: "bash", cwd }, output),
    ).resolves.toBeUndefined();

    expect(output.args.command).toBe("git reset --hard");
  });

  test("does not duplicate bash resolver when the hook runs twice on the same output", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { args: { command: "bun cli/index.ts verify all" } };

    const chatOutput = { messages: [userMessage("hello")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-idempotent", cwd }, chatOutput);
    await plugin["tool.execute.before"]?.({ sessionID: "s-idempotent", tool: "skill", cwd, args: { name: "tdd" } }, { args: { name: "tdd" } });

    await plugin["tool.execute.before"]?.({ sessionID: "s-idempotent", tool: "bash", cwd }, output);
    await plugin["tool.execute.before"]?.({ sessionID: "s-idempotent", tool: "bash", cwd }, output);

    expect(countOccurrences(output.args.command, "export AGENTIC_PLUGIN_ROOT=")).toBe(1);
    expect(countOccurrences(output.args.command, "if ! command -v agentic")).toBe(1);
    expect(output.args.command).toContain('bun "$AGENTIC_CLI_PATH" verify all');
  });

  test("does not duplicate bash resolver across duplicate plugin instances", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const firstPlugin = await ImitationMachinePlugin();
    const secondPlugin = await ImitationMachinePlugin();
    const output = { args: { command: "bun cli/index.ts verify all" } };

    const chatOutput = { messages: [userMessage("hello")] };
    await firstPlugin["experimental.chat.messages.transform"]?.({ sessionID: "s-duplicate-plugin", cwd }, chatOutput);
    await firstPlugin["tool.execute.before"]?.({ sessionID: "s-duplicate-plugin", tool: "skill", cwd, args: { name: "tdd" } }, { args: { name: "tdd" } });

    await firstPlugin["tool.execute.before"]?.({ sessionID: "s-duplicate-plugin", tool: "bash", cwd }, output);
    await secondPlugin["tool.execute.before"]?.({ sessionID: "s-duplicate-plugin", tool: "bash", cwd }, output);

    expect(countOccurrences(output.args.command, "export AGENTIC_PLUGIN_ROOT=")).toBe(1);
    expect(countOccurrences(output.args.command, "if ! command -v agentic")).toBe(1);
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

  test("bootstrap orders specialized checks and verification before final review and release", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { messages: [userMessage("finish this implementation")] };

    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-canonical-bootstrap", cwd }, output);
    const bootstrapText = output.messages[0]?.parts[0]?.text ?? "";

    expect(bootstrapText).toContain("Canonical delivery sequence");
    expectOrdered(bootstrapText, "@coder", "@reviewer-spec");
    expectOrdered(bootstrapText, "@reviewer-spec", "@reviewer-quality");
    for (const specializedCheck of ["@security", "@qa", "@docs"] as const) {
      expectOrdered(bootstrapText, "@reviewer-quality", specializedCheck);
      expectOrdered(bootstrapText, specializedCheck, "fresh verification");
      expectOrdered(bootstrapText, specializedCheck, "@reviewer-final");
    }
    expectOrdered(bootstrapText, "fresh verification", "@reviewer-final");
    expectOrdered(bootstrapText, "@reviewer-final", "@release");
  });

  test("bootstrap routes PR creation through pr guidance separately from release coordination", async () => {
    const cwd = await makeProject(true);
    process.chdir(cwd);
    const plugin = await ImitationMachinePlugin();
    const output = { messages: [userMessage("prepare this for review and release")] };

    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "s-pr-release-routing", cwd }, output);
    const bootstrapText = output.messages[0]?.parts[0]?.text ?? "";

    expect(bootstrapText).not.toContain("PR/release → dispatch @release");
    expect(bootstrapText).toContain("PR creation/review-readiness → load `pr`");
    expect(bootstrapText).toContain("release readiness/version/changelog/tag/publish → coordinate with @release / `release`");
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
    const projectSkillDelegationLine = bootstrapText.split("\n")
      .find((line) => line.includes("project skill names")) ?? "";
    for (const subagent of ["@coder", "@planner", "@architect", "@reviewer-spec", "@reviewer-quality", "@reviewer-final", "@security", "@qa", "@docs"] as const) {
      expect(projectSkillDelegationLine).toContain(subagent);
    }
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

  test("prioritizes packaged skills before existing OpenCode skill paths without duplicates", async () => {
    const plugin = await ImitationMachinePlugin();
    const packagedSkillsPath = join(originalCwd, "skills");
    const repoAgentsSkillsPath = join(originalCwd, ".agents", "skills");
    const repoOpencodeSkillsPath = join(originalCwd, ".opencode", "skills");
    const config = {
      skills: {
        paths: [repoAgentsSkillsPath, packagedSkillsPath, repoOpencodeSkillsPath],
      },
    } as {
      skills?: { paths?: string[] };
    };

    await plugin.config?.(config);

    expect(config.skills?.paths).toEqual([
      packagedSkillsPath,
      repoAgentsSkillsPath,
      repoOpencodeSkillsPath,
    ]);
    expect(config.skills?.paths?.filter((skillPath) => skillPath === packagedSkillsPath)).toHaveLength(1);
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
    expect(config.agent?.["reviewer-final"]?.mode).toBe("subagent");
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
