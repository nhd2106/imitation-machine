import type { GateContext, GateResult, GateDetail } from "./types";

export async function run(ctx: GateContext): Promise<GateResult> {
  const start = Date.now();
  const details: GateDetail[] = [];

  const proc = Bun.spawn(["bunx", "tsc", "--noEmit"], {
    cwd: ctx.cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  const output = (stdout + stderr).trim();
  const passed = exitCode === 0;

  if (passed) {
    details.push({ severity: "info", message: "TypeScript: 0 errors" });
  } else {
    const lines = output.split("\n").filter(Boolean);
    for (const line of lines) {
      details.push({ severity: "error", message: line });
    }
  }

  return { name: "typecheck", ref: ctx.ref, passed, details, durationMs: Date.now() - start };
}
