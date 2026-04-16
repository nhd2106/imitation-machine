import type { GateContext, GateResult, GateDetail } from "./types";

const THRESHOLD = 80;

export async function run(ctx: GateContext): Promise<GateResult> {
  const start = Date.now();
  const details: GateDetail[] = [];

  const proc = Bun.spawn(["bun", "test", "--coverage", "--coverage-reporter=text"], {
    cwd: ctx.cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  const pct = extractCoveragePct(`${stdout}\n${stderr}`);

  if (pct === null) {
    details.push({ severity: "warn", message: "Could not parse coverage output" });
    return {
      name: "coverage",
      ref: ctx.ref,
      passed: false,
      details,
      durationMs: Date.now() - start,
    };
  }

  const passed = pct >= THRESHOLD;

  details.push({
    severity: passed ? "info" : "error",
    message: `Line coverage: ${pct.toFixed(1)}% (threshold: ${THRESHOLD}%)`,
  });

  return { name: "coverage", ref: ctx.ref, passed, details, durationMs: Date.now() - start };
}

export function extractCoveragePct(stdout: string): number | null {
  const trimmed = stdout.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^All files\s+\|\s+[\d.]+\s+\|\s+([\d.]+)\s+\|?$/m);
  if (!match?.[1]) return null;

  const pct = parseFloat(match[1]);
  return Number.isFinite(pct) ? pct : null;
}
