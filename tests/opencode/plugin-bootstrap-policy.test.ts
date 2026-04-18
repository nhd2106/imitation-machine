import { beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ImitationMachinePlugin from "../../.opencode/plugins/imitation-machine.js";

type MessagePart = { type: string; text: string };
type ChatMessage = { info: { role: string }; parts: MessagePart[] };

function userMessage(text: string): ChatMessage {
  return {
    info: { role: "user" },
    parts: [{ type: "text", text }],
  };
}

describe("OpenCode bootstrap policy", () => {
  beforeEach(() => {
    delete process.env.IMITATION_BOOTSTRAP;
    delete process.env.IMITATION_FORCE;
  });

  async function makeOptedInRepo(): Promise<string> {
    const cwd = await mkdtemp(join(tmpdir(), "imitation-machine-bootstrap-"));
    await mkdir(join(cwd, ".opencode"), { recursive: true });
    await writeFile(join(cwd, ".imitation-machine-enabled"), "\n");
    return cwd;
  }

  test("keeps bootstrap state across multiple turns in opted-in repos", async () => {
    const cwd = await makeOptedInRepo();
    const plugin = await ImitationMachinePlugin();

    const firstTurn = { messages: [userMessage("Help me figure out the next steps for this repo.")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "bootstrap-policy", cwd }, firstTurn);

    const firstTurnText = firstTurn.messages[0]?.parts[0]?.text ?? "";
    expect(firstTurnText).toContain("You have Imitation Machine workflow skills installed.");
    expect(firstTurnText).toContain("Load a process skill");

    await expect(
      plugin["tool.execute.before"]?.(
        { sessionID: "bootstrap-policy", tool: "edit", cwd },
        { args: { filePath: "/tmp/policy.txt" } },
      ),
    ).rejects.toThrow("implementation workflow skill");

    const secondTurn = { messages: [userMessage("Great, now write the implementation plan.")] };
    await plugin["experimental.chat.messages.transform"]?.({ sessionID: "bootstrap-policy", cwd }, secondTurn);

    const secondTurnText = secondTurn.messages[0]?.parts[0]?.text ?? "";
    expect(secondTurnText).not.toContain("EXTREMELY_IMPORTANT");

    await plugin["tool.execute.before"]?.(
      { sessionID: "bootstrap-policy", tool: "skill", cwd, args: { name: "plan" } },
      { args: { name: "plan" } },
    );

    await expect(
      plugin["tool.execute.before"]?.(
        { sessionID: "bootstrap-policy", tool: "edit", cwd },
        { args: { filePath: "/tmp/policy.txt" } },
      ),
    ).resolves.toBeUndefined();
  });
});
