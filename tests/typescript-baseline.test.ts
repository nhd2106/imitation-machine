import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const SUBPROCESS_TEST_TIMEOUT_MS = 15_000;

describe("TypeScript baseline", () => {
  test("raw repo-wide typecheck succeeds", async () => {
    const repoRoot = fileURLToPath(new URL("../", import.meta.url));
    const proc = Bun.spawn(["bunx", "tsc", "--noEmit"], {
      cwd: repoRoot,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  }, SUBPROCESS_TEST_TIMEOUT_MS);
});
