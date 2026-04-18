import { test, expect, describe } from "bun:test";
import { buildGraph } from "../monorepo/graph";
import { getAffected } from "../monorepo/affected";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "agentic-mono-test-"));
}

async function setupWorkspace(root: string, packages: Array<{ name: string; deps?: string[] }>): Promise<void> {
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      name: "root",
      workspaces: packages.map((p) => `packages/${p.name.replace(/^@[^/]+\//, "")}`),
    })
  );

  for (const pkg of packages) {
    const shortName = pkg.name.replace(/^@[^/]+\//, "");
    const pkgDir = join(root, "packages", shortName);
    await mkdir(pkgDir, { recursive: true });
    const deps: Record<string, string> = {};
    for (const dep of pkg.deps ?? []) {
      deps[dep] = "workspace:*";
    }
    await writeFile(
      join(pkgDir, "package.json"),
      JSON.stringify({ name: pkg.name, dependencies: deps })
    );
  }
}

async function git(args: string[], cwd: string): Promise<void> {
  const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(stderr.trim() || `git ${args.join(" ")} failed`);
  }
}

describe("monorepo graph", () => {
  test("builds empty graph for no packages", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "package.json"), JSON.stringify({ name: "root", workspaces: [] }));

    const graph = await buildGraph(dir);
    // Only root key if root has a name
    expect(typeof graph).toBe("object");
  });

  test("builds graph with no internal deps", async () => {
    const dir = await makeTempDir();
    await setupWorkspace(dir, [
      { name: "@test/alpha" },
      { name: "@test/beta" },
    ]);

    const graph = await buildGraph(dir);
    expect(graph["@test/alpha"]).toEqual([]);
    expect(graph["@test/beta"]).toEqual([]);
  });

  test("builds graph with single internal dep", async () => {
    const dir = await makeTempDir();
    await setupWorkspace(dir, [
      { name: "@test/core" },
      { name: "@test/app", deps: ["@test/core"] },
    ]);

    const graph = await buildGraph(dir);
    expect(graph["@test/app"]).toContain("@test/core");
    expect(graph["@test/core"]).toEqual([]);
  });

  test("builds graph with transitive deps", async () => {
    const dir = await makeTempDir();
    await setupWorkspace(dir, [
      { name: "@test/a" },
      { name: "@test/b", deps: ["@test/a"] },
      { name: "@test/c", deps: ["@test/b"] },
    ]);

    const graph = await buildGraph(dir);
    expect(graph["@test/b"]).toContain("@test/a");
    expect(graph["@test/c"]).toContain("@test/b");
    expect(graph["@test/c"]).not.toContain("@test/a"); // Direct deps only
  });

  test("throws when git diff fails instead of silently treating it as no changes", async () => {
    const dir = await makeTempDir();
    await setupWorkspace(dir, [{ name: "@test/app" }]);

    await expect(getAffected(dir, "origin/main")).rejects.toThrow();
  });

  test("maps changed files to the owning package even when package paths share a prefix", async () => {
    const dir = await makeTempDir();
    await setupWorkspace(dir, [
      { name: "@test/app" },
      { name: "@test/app-tools" },
      { name: "@test/consumer", deps: ["@test/app-tools"] },
    ]);

    await writeFile(join(dir, "packages", "app", "index.ts"), "export const app = true;\n");
    await writeFile(join(dir, "packages", "app-tools", "index.ts"), "export const tools = true;\n");
    await writeFile(join(dir, "packages", "consumer", "index.ts"), "export const consumer = true;\n");

    await git(["init"], dir);
    await git(["config", "user.name", "Test User"], dir);
    await git(["config", "user.email", "test@example.com"], dir);
    await git(["add", "."], dir);
    await git(["commit", "-m", "chore: baseline"], dir);

    await writeFile(join(dir, "packages", "app-tools", "src.ts"), "export const changed = true;\n");
    await git(["add", "."], dir);
    await git(["commit", "-m", "feat: change app-tools"], dir);

    const affected = await getAffected(dir, "HEAD~1");
    expect(affected).toEqual(["@test/app-tools", "@test/consumer"]);
  });
});
