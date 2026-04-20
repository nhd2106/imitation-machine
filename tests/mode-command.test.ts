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
  test("help explains modes, precedence, and persistent overrides", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-mode-cli-"));
    const result = await runModeCli(["--help"], cwd, {});

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("MODES");
    expect(result.stdout).toContain("lite      Allows bash and file writes after bootstrap.");
    expect(result.stdout).toContain("standard  Allows bash after bootstrap, but still requires a workflow skill before file writes.");
    expect(result.stdout).toContain("strict    Requires a workflow skill before bash or file writes.");
    expect(result.stdout).toContain("project override > repo config > fallback standard");
    expect(result.stdout).toContain("Overrides are stored outside the repo and stay active until you run `agentic mode clear`.");
  });

  test("show reports resolved repo mode", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-mode-cli-"));
    const storePath = join(cwd, "mode-store.json");
    await mkdir(join(cwd, ".opencode"), { recursive: true });
    await writeFile(join(cwd, ".imitation-machine.json"), JSON.stringify({ mode: "lite" }, null, 2));

    const result = await runModeCli(["show", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Effective mode: lite");
    expect(result.stdout).toContain("Source: repo config from .imitation-machine.json");
    expect(result.stdout).toContain(`Relevant path: ${join(cwd, ".imitation-machine.json")}`);
    expect(result.stdout).toContain("In practice: Lite relaxes the pre-workflow guard after bootstrap: bash and file writes are allowed without an implementation workflow skill.");
    expect(result.stdout).toContain("To change it: agentic mode lite|standard|strict");
  });

  test("set commands persist override until clear", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-mode-cli-"));
    const storePath = join(cwd, "mode-store.json");
    await mkdir(join(cwd, ".opencode"), { recursive: true });
    await writeFile(join(cwd, ".imitation-machine.json"), JSON.stringify({ mode: "lite" }, null, 2));

    const setResult = await runModeCli(["strict", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });
    expect(setResult.exitCode).toBe(0);
    expect(setResult.stdout).toContain("Saved a per-project mode override: strict");
    expect(setResult.stdout).toContain("Run `agentic mode show --cwd");

    const showOverride = await runModeCli(["show", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });
    expect(showOverride.exitCode).toBe(0);
    expect(showOverride.stdout).toContain("Effective mode: strict");
    expect(showOverride.stdout).toContain("Source: per-project override from override store");
    expect(showOverride.stdout).toContain(`Relevant path: ${storePath}`);
    expect(showOverride.stdout).toContain("To revert to the repo default or fallback: agentic mode clear");

    const clearResult = await runModeCli(["clear", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });
    expect(clearResult.exitCode).toBe(0);
    expect(clearResult.stdout).toContain("Cleared the per-project mode override");
    expect(clearResult.stdout).toContain("Run `agentic mode show --cwd");

    const showCleared = await runModeCli(["show", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });
    expect(showCleared.exitCode).toBe(0);
    expect(showCleared.stdout).toContain("Effective mode: lite");
    expect(showCleared.stdout).toContain("Source: repo config from .imitation-machine.json");
  });

  test("clear reports when no per-project override existed", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-mode-cli-"));
    const storePath = join(cwd, "mode-store.json");
    await writeFile(join(cwd, ".imitation-machine.json"), JSON.stringify({ mode: "lite" }, null, 2));

    const result = await runModeCli(["clear", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No valid per-project mode override was set");
    expect(result.stdout).not.toContain("Cleared the per-project mode override");
    expect(result.stdout).toContain("Effective mode: lite");
  });

  test("clear does not claim success when only a malformed project override entry existed", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-mode-cli-"));
    const storePath = join(cwd, "mode-store.json");
    await writeFile(join(cwd, ".imitation-machine.json"), JSON.stringify({ mode: "lite" }, null, 2));
    await writeFile(storePath, JSON.stringify({ version: 1, overrides: { [cwd]: false } }, null, 2));

    const result = await runModeCli(["clear", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No valid per-project mode override was set");
    expect(result.stdout).not.toContain("Cleared the per-project mode override");
    expect(result.stdout).toContain("Effective mode: lite");
  });

  test("invalid stored override falls back safely", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-mode-cli-"));
    const storePath = join(cwd, "mode-store.json");
    await writeFile(join(cwd, ".imitation-machine.json"), JSON.stringify({ mode: "standard" }, null, 2));
    await writeFile(storePath, JSON.stringify({ version: 1, overrides: { [cwd]: "broken" } }, null, 2));

    const result = await runModeCli(["show", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Effective mode: standard");
    expect(result.stdout).toContain("Source: repo config from .imitation-machine.json");
    expect(result.stdout).toContain(`Relevant path: ${storePath}`);
    expect(result.stderr).toContain(`Warning: Ignoring malformed project mode override \"broken\" in ${storePath}.`);
  });

  test("show warns when repo config mode is malformed", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-mode-cli-"));
    const storePath = join(cwd, "mode-store.json");
    await writeFile(join(cwd, ".imitation-machine.json"), JSON.stringify({ mode: "turbo" }, null, 2));

    const result = await runModeCli(["show", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Effective mode: standard");
    expect(result.stdout).toContain("Source: built-in fallback (no override or valid repo config)");
    expect(result.stdout).toContain(`Relevant path: ${join(cwd, ".imitation-machine.json")}`);
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
    expect(result.stdout).toContain("Effective mode: standard");
    expect(result.stdout).toContain("Source: built-in fallback (no override or valid repo config)");
    expect(result.stderr).toContain(`Warning: Ignoring malformed JSON in ${configPath}.`);
  });

  test("show warns when current project override value is not a string", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-mode-cli-"));
    const storePath = join(cwd, "mode-store.json");
    await writeFile(storePath, JSON.stringify({ version: 1, overrides: { [cwd]: false } }, null, 2));

    const result = await runModeCli(["show", "--cwd", cwd], cwd, { AGENTIC_MODE_STORE_PATH: storePath });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Effective mode: standard");
    expect(result.stdout).toContain("Source: built-in fallback (no override or valid repo config)");
    expect(result.stdout).toContain(`Relevant path: ${storePath}`);
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
