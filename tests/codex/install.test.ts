import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, readlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = process.cwd();
const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(tempPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function runInstaller(tempRoot: string, agentsDir = join(tempRoot, "agents-home")) {
  const proc = Bun.spawn(["bash", join(ROOT, "scripts", "install-local-codex.sh")], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      HOME: tempRoot,
      CODEX_AGENTS_DIR: agentsDir,
    },
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode, agentsDir };
}

describe("codex local installer", () => {
  test("package exposes a focused codex installer verification lane", async () => {
    const packageJson = await Bun.file(join(ROOT, "package.json")).json() as {
      scripts?: Record<string, string>;
      files?: string[];
    };

    expect(packageJson.scripts?.["test:codex"]).toBe("bash tests/codex/run-tests.sh");
    expect(packageJson.files).toContain(".codex-plugin/**");
  });

  test("checked-in codex plugin manifest declares packaged skills and UI metadata", async () => {
    const [packageJson, pluginJson] = await Promise.all([
      Bun.file(join(ROOT, "package.json")).json() as Promise<{ version?: string }>,
      Bun.file(join(ROOT, ".codex-plugin", "plugin.json")).json() as Promise<{
        version?: string;
        skills?: string;
        hooks?: unknown;
        mcpServers?: unknown;
        apps?: unknown;
        agents?: unknown;
        interface?: {
          displayName?: string;
          shortDescription?: string;
          category?: string;
        };
      }>,
    ]);

    expect(pluginJson.version).toBe(packageJson.version);
    expect(pluginJson.skills).toBe("./skills/");
    expect(pluginJson.interface?.displayName).toBeDefined();
    expect(pluginJson.interface?.shortDescription).toBeDefined();
    expect(pluginJson.interface?.category).toBe("Development");
    expect(pluginJson.hooks).toBeUndefined();
    expect(pluginJson.mcpServers).toBeUndefined();
    expect(pluginJson.apps).toBeUndefined();
    expect(pluginJson.agents).toBeUndefined();
  });

  test("installer creates a local codex plugin root, skills symlink, and marketplace entry", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "agentic-codex-install-"));
    tempPaths.push(tempRoot);

    const pluginRoot = join(tempRoot, "plugins", "imitation-machine");
    const { stdout, stderr, exitCode, agentsDir } = await runInstaller(tempRoot);

    expect(exitCode).toBe(0);
    expect(stderr).toBe("");

    const pluginJson = await Bun.file(join(pluginRoot, "plugin.json")).json() as {
      name?: string;
      skills?: string;
      hooks?: unknown;
      mcpServers?: unknown;
      apps?: unknown;
      agents?: unknown;
      interface?: {
        displayName?: string;
        shortDescription?: string;
        category?: string;
      };
    };
    const marketplace = await Bun.file(join(agentsDir, "plugins", "marketplace.json")).json() as {
      plugins?: Array<{
        name?: string;
        source?: { source?: string; path?: string };
        policy?: { installation?: string; authentication?: string };
        category?: string;
      }>;
    };

    expect(pluginJson.name).toBe("imitation-machine");
    expect(pluginJson.skills).toBe("./skills/");
    expect(pluginJson.interface?.displayName).toBeDefined();
    expect(pluginJson.hooks).toBeUndefined();
    expect(pluginJson.mcpServers).toBeUndefined();
    expect(pluginJson.apps).toBeUndefined();
    expect(pluginJson.agents).toBeUndefined();
    expect(await readlink(join(pluginRoot, "skills"))).toBe(join(ROOT, "skills"));
    expect((await readdir(pluginRoot)).sort()).toEqual(["plugin.json", "skills"]);
    expect(await Bun.file(join(agentsDir, "AGENTS.md")).exists()).toBe(false);
    expect(marketplace.plugins).toContainEqual({
      name: "imitation-machine",
      source: {
        source: "local",
        path: "./plugins/imitation-machine",
      },
      policy: {
        installation: "AVAILABLE",
        authentication: "NONE",
      },
      category: "Development",
    });
    expect(stdout).toContain("Installed Imitation Machine as a Codex local plugin.");
    expect(stdout).toContain(pluginRoot);
    expect(stdout).toContain("marketplace.json");
    expect(stdout).toContain("no bootstrap injection");
    expect(stdout).toContain("no hooks");
    expect(stdout).toContain("no `mcpServers`");
    expect(stdout).toContain("no apps");
    expect(stdout).toContain("no agents support");
    expect(stdout).toContain("no live Codex harness claim");
  });

  test("installer updates the imitation-machine marketplace entry without dropping other plugins and preserves compatible extra fields", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "agentic-codex-marketplace-"));
    tempPaths.push(tempRoot);

    const agentsDir = join(tempRoot, "agents-home");
    await mkdir(join(agentsDir, "plugins"), { recursive: true });
    await Bun.write(
      join(agentsDir, "plugins", "marketplace.json"),
      JSON.stringify(
        {
          plugins: [
            {
              name: "other-plugin",
              source: { source: "local", path: "./plugins/other-plugin" },
              policy: { installation: "AVAILABLE", authentication: "NONE" },
              category: "Utilities",
            },
            {
              name: "imitation-machine",
              source: { source: "registry", path: "./plugins/outdated-location", mirror: "cached" },
              policy: { installation: "HIDDEN", authentication: "ON_INSTALL", review: "keep-me" },
              category: "Utilities",
              owner: { team: "workflow" },
            },
          ],
        },
        null,
        2,
      ),
    );

    const { exitCode } = await runInstaller(tempRoot, agentsDir);
    expect(exitCode).toBe(0);

    const marketplace = await Bun.file(join(agentsDir, "plugins", "marketplace.json")).json() as {
      plugins?: Array<Record<string, unknown>>;
    };

    expect(marketplace.plugins?.filter((plugin) => plugin.name === "imitation-machine")).toEqual([
      {
        name: "imitation-machine",
        source: { source: "local", path: "./plugins/imitation-machine", mirror: "cached" },
        policy: { installation: "AVAILABLE", authentication: "NONE", review: "keep-me" },
        category: "Development",
        owner: { team: "workflow" },
      },
    ]);
    expect(marketplace.plugins).toContainEqual({
      name: "other-plugin",
      source: { source: "local", path: "./plugins/other-plugin" },
      policy: { installation: "AVAILABLE", authentication: "NONE" },
      category: "Utilities",
    });
  });

  test("installer fails without overwriting malformed marketplace json", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "agentic-codex-bad-marketplace-"));
    tempPaths.push(tempRoot);

    const agentsDir = join(tempRoot, "agents-home");
    await mkdir(join(agentsDir, "plugins"), { recursive: true });
    const marketplacePath = join(agentsDir, "plugins", "marketplace.json");
    const invalidJson = '{"plugins": [';
    await Bun.write(marketplacePath, invalidJson);

    const { stderr, exitCode } = await runInstaller(tempRoot, agentsDir);

    expect(exitCode).toBe(1);
    expect(stderr).toContain("marketplace.json is not valid JSON");
    expect(await Bun.file(marketplacePath).text()).toBe(invalidJson);
  });

  test("installer fails without overwriting a non-object marketplace root", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "agentic-codex-array-marketplace-"));
    tempPaths.push(tempRoot);

    const agentsDir = join(tempRoot, "agents-home");
    await mkdir(join(agentsDir, "plugins"), { recursive: true });
    const marketplacePath = join(agentsDir, "plugins", "marketplace.json");
    const nonObjectRoot = JSON.stringify([{"name": "other-plugin"}], null, 2);
    await Bun.write(marketplacePath, `${nonObjectRoot}\n`);

    const { stderr, exitCode } = await runInstaller(tempRoot, agentsDir);

    expect(exitCode).toBe(1);
    expect(stderr).toContain("marketplace.json must contain a JSON object root");
    expect(await Bun.file(marketplacePath).text()).toBe(`${nonObjectRoot}\n`);
    expect(await Bun.file(join(tempRoot, "plugins", "imitation-machine", "plugin.json")).exists()).toBe(false);
  });

  test("installer fails without overwriting a marketplace with a non-array plugins field", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "agentic-codex-plugins-object-marketplace-"));
    tempPaths.push(tempRoot);

    const agentsDir = join(tempRoot, "agents-home");
    await mkdir(join(agentsDir, "plugins"), { recursive: true });
    const marketplacePath = join(agentsDir, "plugins", "marketplace.json");
    const invalidPluginsRoot = JSON.stringify({ plugins: { name: "other-plugin" } }, null, 2);
    await Bun.write(marketplacePath, `${invalidPluginsRoot}\n`);

    const { stderr, exitCode } = await runInstaller(tempRoot, agentsDir);

    expect(exitCode).toBe(1);
    expect(stderr).toContain("marketplace.json plugins must be an array");
    expect(await Bun.file(marketplacePath).text()).toBe(`${invalidPluginsRoot}\n`);
    expect(await Bun.file(join(tempRoot, "plugins", "imitation-machine", "plugin.json")).exists()).toBe(false);
  });

  test("installer does not update marketplace when plugin-root staging fails", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "agentic-codex-plugin-root-fail-"));
    tempPaths.push(tempRoot);

    const agentsDir = join(tempRoot, "agents-home");
    await mkdir(join(agentsDir, "plugins"), { recursive: true });
    const marketplacePath = join(agentsDir, "plugins", "marketplace.json");
    const originalMarketplace = JSON.stringify(
      {
        plugins: [
          {
            name: "other-plugin",
            source: { source: "local", path: "./plugins/other-plugin" },
            policy: { installation: "AVAILABLE", authentication: "NONE" },
            category: "Utilities",
          },
        ],
      },
      null,
      2,
    );
    await Bun.write(marketplacePath, `${originalMarketplace}\n`);
    await Bun.write(join(tempRoot, "plugins"), "occupied by file\n");

    const { stderr, exitCode } = await runInstaller(tempRoot, agentsDir);

    expect(exitCode).toBe(1);
    expect(stderr).not.toBe("");
    expect(await Bun.file(marketplacePath).text()).toBe(`${originalMarketplace}\n`);
    expect(await Bun.file(join(tempRoot, "plugins", "imitation-machine", "plugin.json")).exists()).toBe(false);
  });

  test("installer rerun removes stale files and restages a minimal plugin root", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "agentic-codex-rerun-"));
    tempPaths.push(tempRoot);

    const pluginRoot = join(tempRoot, "plugins", "imitation-machine");
    await mkdir(pluginRoot, { recursive: true });
    await Bun.write(join(pluginRoot, "stale.txt"), "leftover\n");
    await Bun.write(join(pluginRoot, "old-manifest.json"), "{}\n");

    const { exitCode } = await runInstaller(tempRoot);

    expect(exitCode).toBe(0);
    expect((await readdir(pluginRoot)).sort()).toEqual(["plugin.json", "skills"]);
    expect(await Bun.file(join(pluginRoot, "stale.txt")).exists()).toBe(false);
    expect(await Bun.file(join(pluginRoot, "old-manifest.json")).exists()).toBe(false);
    expect(await readlink(join(pluginRoot, "skills"))).toBe(join(ROOT, "skills"));
  });
});
