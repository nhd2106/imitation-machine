import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = process.cwd();

type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

async function runModeCli(args: string[], cwd: string, env: Record<string, string>): Promise<CommandResult> {
  const proc = Bun.spawn([process.execPath, "cli/index.ts", "mode", ...args], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      ...env,
      AGENTIC_DB_PATH: join(cwd, "agentic.db"),
    },
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
}

describe("mode command", () => {
  test("show reports resolved repo mode", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-mode-cli-"));
    const storePath = join(cwd, "mode-store.json");
    await mkdir(join(cwd, ".opencode"), { recursive: true });
    await writeFile(join(cwd, ".imitation-machine.json"), JSON.stringify({ mode: "lite" }, null, 2));

    const result = await runModeCli(["show", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Mode: lite");
    expect(result.stdout).toContain("Source: repo-config");
  });

  test("set commands persist override until clear", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-mode-cli-"));
    const storePath = join(cwd, "mode-store.json");
    await mkdir(join(cwd, ".opencode"), { recursive: true });
    await writeFile(join(cwd, ".imitation-machine.json"), JSON.stringify({ mode: "lite" }, null, 2));

    const setResult = await runModeCli(["strict", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });
    expect(setResult.exitCode).toBe(0);
    expect(setResult.stdout).toContain("Mode override set to strict");

    const showOverride = await runModeCli(["show", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });
    expect(showOverride.exitCode).toBe(0);
    expect(showOverride.stdout).toContain("Mode: strict");
    expect(showOverride.stdout).toContain("Source: override");

    const clearResult = await runModeCli(["clear", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });
    expect(clearResult.exitCode).toBe(0);
    expect(clearResult.stdout).toContain("Cleared mode override");

    const showCleared = await runModeCli(["show", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });
    expect(showCleared.exitCode).toBe(0);
    expect(showCleared.stdout).toContain("Mode: lite");
    expect(showCleared.stdout).toContain("Source: repo-config");
  });

  test("invalid stored override falls back safely", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-mode-cli-"));
    const storePath = join(cwd, "mode-store.json");
    await writeFile(join(cwd, ".imitation-machine.json"), JSON.stringify({ mode: "standard" }, null, 2));
    await writeFile(storePath, JSON.stringify({ version: 1, overrides: { [cwd]: "broken" } }, null, 2));

    const result = await runModeCli(["show", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Mode: standard");
    expect(result.stdout).toContain("Source: repo-config");
    expect(result.stderr).toContain(`Warning: Ignoring malformed project mode override \"broken\" in ${storePath}.`);
  });

  test("show warns when repo config mode is malformed", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-mode-cli-"));
    const storePath = join(cwd, "mode-store.json");
    await writeFile(join(cwd, ".imitation-machine.json"), JSON.stringify({ mode: "turbo" }, null, 2));

    const result = await runModeCli(["show", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Mode: standard");
    expect(result.stdout).toContain("Source: fallback");
    expect(result.stderr).toContain(
      `Warning: Ignoring malformed repo mode \"turbo\" in ${join(cwd, ".imitation-machine.json")}.`,
    );
  });

  test("show warns when repo config JSON is malformed", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-mode-cli-"));
    const storePath = join(cwd, "mode-store.json");
    const configPath = join(cwd, ".imitation-machine.json");
    await writeFile(configPath, "{ mode: ");

    const result = await runModeCli(["show", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Mode: standard");
    expect(result.stdout).toContain("Source: fallback");
    expect(result.stderr).toContain(`Warning: Ignoring malformed JSON in ${configPath}.`);
  });

  test("show warns when current project override value is not a string", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-mode-cli-"));
    const storePath = join(cwd, "mode-store.json");
    await writeFile(storePath, JSON.stringify({ version: 1, overrides: { [cwd]: false } }, null, 2));

    const result = await runModeCli(["show", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Mode: standard");
    expect(result.stdout).toContain("Source: fallback");
    expect(result.stderr).toContain(`Warning: Ignoring non-string project mode override in ${storePath} for ${cwd}.`);
  });

  test("set command fails clearly when the override store is malformed", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-mode-cli-"));
    const storePath = join(cwd, "mode-store.json");
    await writeFile(storePath, "{ overrides: ");

    const result = await runModeCli(["strict", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(`Fatal error: Mode override store is invalid: ${storePath}`);
    expect(await Bun.file(storePath).text()).toBe("{ overrides: ");
  });

  test("show fails clearly when --cwd is provided without a value", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-mode-cli-"));
    const storePath = join(cwd, "mode-store.json");

    const result = await runModeCli(["show", "--cwd"], cwd, { AGENTIC_MODE_STORE_PATH: storePath });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Missing value for --cwd.");
  });
});
