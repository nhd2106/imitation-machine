import { describe, expect, test } from "bun:test";
import { chmod, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildDefaultChecks, runVerificationChecklist, type VerificationCheck } from "../cli/commands/verify";

const SUBPROCESS_TEST_TIMEOUT_MS = 15_000;

describe("verify command", () => {
  test("buildDefaultChecks returns expected check IDs", () => {
    const checks = buildDefaultChecks("/tmp/workspace", "abc123");
    expect(checks.map((check) => check.id)).toEqual(["merge-gates", "typecheck", "tests"]);
  });

  test("runVerificationChecklist reports pass and fail checks", async () => {
    const checks: VerificationCheck[] = [
      {
        id: "pass-check",
        description: "pass",
        command: ["bun", "-e", "process.exit(0)"],
      },
      {
        id: "fail-check",
        description: "fail",
        command: ["bun", "-e", "process.exit(2)"],
      },
    ];

    const results = await runVerificationChecklist(checks, process.cwd());

    expect(results).toHaveLength(2);
    expect(results[0]?.id).toBe("pass-check");
    expect(results[0]?.success).toBe(true);
    expect(results[1]?.id).toBe("fail-check");
    expect(results[1]?.success).toBe(false);
    expect(results[1]?.exitCode).toBe(2);
  });

  test("verify all tolerates a transient db lock while invoking nested gate all", async () => {
    const repoRoot = process.cwd();
    const tempDir = await mkdtemp(join(tmpdir(), "agentic-verify-lock-"));
    const workspaceDir = join(tempDir, "workspace");
    const binDir = join(tempDir, "bin");
    const dbPath = join(tempDir, "state.db");
    const lockReadyPath = join(tempDir, "gate-lock.ready");
    const bunPath = process.execPath;

    await mkdir(workspaceDir, { recursive: true });
    await mkdir(binDir, { recursive: true });
    await writeFile(join(workspaceDir, "safe.ts"), "export const ok = true;\n");

    const bunWrapperPath = join(binDir, "bun");
    await writeFile(bunWrapperPath, `#!/bin/sh
REAL_BUN=${JSON.stringify(bunPath)}
REPO_ROOT=${JSON.stringify(repoRoot)}
LOCK_READY_PATH=${JSON.stringify(lockReadyPath)}

if [ "$1" = "cli/index.ts" ] && [ "$2" = "gate" ] && [ "$3" = "all" ]; then
  rm -f "$LOCK_READY_PATH"
  AGENTIC_DB_PATH="$AGENTIC_DB_PATH" LOCK_READY_PATH="$LOCK_READY_PATH" "$REAL_BUN" -e 'import { Database } from "bun:sqlite"; const db = new Database(process.env.AGENTIC_DB_PATH!, { create: true }); db.exec("PRAGMA journal_mode=WAL;"); db.exec("CREATE TABLE IF NOT EXISTS gate_lock (id INTEGER PRIMARY KEY);"); db.exec("BEGIN EXCLUSIVE;"); db.exec("INSERT INTO gate_lock DEFAULT VALUES;"); await Bun.write(process.env.LOCK_READY_PATH!, "ready"); setTimeout(() => { db.exec("COMMIT;"); db.close(); }, 500); setTimeout(() => process.exit(0), 550);' >/dev/null 2>&1 &
  while [ ! -f "$LOCK_READY_PATH" ]; do
    sleep 0.01
  done
  shift
  exec "$REAL_BUN" "$REPO_ROOT/cli/index.ts" "$@"
fi

if [ "$1" = "test" ] && [ "$2" = "--coverage" ] && [ "$3" = "--coverage-reporter=text" ]; then
  printf '%s\n' '------------------------------|---------|---------|-------------------' 'File                          | % Funcs | % Lines | Uncovered Line #s' '------------------------------|---------|---------|-------------------' 'All files                     |  100.00 |  100.00 |'
  exit 0
fi

if [ "$1" = "test" ]; then
  printf '%s\n' 'bun test v1.3.8 (test-double)' '' ' 1 pass' ' 0 fail'
  exit 0
fi

exec "$REAL_BUN" "$@"
`);
    await chmod(bunWrapperPath, 0o755);

    const bunxWrapperPath = join(binDir, "bunx");
    await writeFile(bunxWrapperPath, `#!/bin/sh
if [ "$1" = "tsc" ] && [ "$2" = "--noEmit" ]; then
  exit 0
fi

exit 1
`);
    await chmod(bunxWrapperPath, 0o755);

    const proc = Bun.spawn([bunPath, "cli/index.ts", "verify", "all", "--cwd", workspaceDir, "--ref", "nested-lock"], {
      cwd: repoRoot,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        AGENTIC_DB_PATH: dbPath,
        PATH: `${binDir}:${process.env.PATH ?? ""}`,
      },
    });

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect(exitCode).toBe(0);
    expect(`${stdout}${stderr}`).toContain("$ bun cli/index.ts gate all --cwd");
    expect(`${stdout}${stderr}`).toContain("✓ All gates passed");
    expect(`${stdout}${stderr}`).toContain("✓ Verification passed");
  }, SUBPROCESS_TEST_TIMEOUT_MS);
});
