import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const ROOT = process.cwd();

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn([process.execPath, "cli/index.ts", ...args], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      AGENTIC_DB_PATH: join(ROOT, ".tmp-cli-help.db"),
    },
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
}

describe("cli help", () => {
  test("top-level help advertises mode subcommands", async () => {
    const result = await runCli(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("mode      Explain or override project mode (show, lite, standard, strict, clear)");
    expect(result.stdout).toContain("Run `agentic mode --help` for mode precedence and override details.");
  });
});
