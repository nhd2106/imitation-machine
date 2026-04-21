import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = process.cwd();
const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(tempPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("codex local installer", () => {
  test("package exposes a focused codex installer verification lane", async () => {
    const packageJson = await Bun.file(join(ROOT, "package.json")).json() as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["test:codex"]).toBe("bash tests/codex/run-tests.sh");
  });

  test("installer links the repo skills bundle into CODEX_AGENTS_DIR", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "agentic-codex-install-"));
    tempPaths.push(tempRoot);

    const agentsDir = join(tempRoot, "agents-home");
    const proc = Bun.spawn(["bash", join(ROOT, "scripts", "install-local-codex.sh")], {
      cwd: ROOT,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        CODEX_AGENTS_DIR: agentsDir,
      },
    });

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect(exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(await readlink(join(agentsDir, "skills", "imitation-machine"))).toBe(join(ROOT, "skills"));
    expect(stdout).toContain("supported local install surface");
    expect(stdout).toContain("no plugin integration");
    expect(stdout).toContain("no bootstrap injection");
  });
});
