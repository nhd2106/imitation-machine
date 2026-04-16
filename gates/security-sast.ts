import type { GateContext, GateResult, GateDetail } from "./types";

// Lightweight SAST patterns targeting critical issues only
const SAST_RULES: Array<{ id: string; severity: "error" | "warn"; pattern: RegExp; message: string }> = [
  {
    id: "SAST-001",
    severity: "error",
    pattern: /eval\s*\(/,
    message: "eval() usage — code injection risk",
  },
  {
    id: "SAST-002",
    severity: "error",
    pattern: /new\s+Function\s*\(/,
    message: "new Function() — code injection risk",
  },
  {
    id: "SAST-003",
    severity: "error",
    pattern: /child_process\.exec\s*\(\s*`[^`]*\$\{/,
    message: "Unsanitized template literal in exec() — command injection risk",
  },
  {
    id: "SAST-004",
    severity: "warn",
    pattern: /Math\.random\(\)/,
    message: "Math.random() — not cryptographically secure; use crypto.getRandomValues()",
  },
  {
    id: "SAST-005",
    severity: "error",
    pattern: /dangerouslySetInnerHTML/,
    message: "dangerouslySetInnerHTML — XSS risk",
  },
  {
    id: "SAST-006",
    severity: "error",
    pattern: /process\.env(?:\.[A-Z0-9_]+|\[[^\]]+\])\.(?:trim|toLowerCase|toUpperCase|replace|slice)\(/,
    message: "process.env value dereferenced without a guard or fallback",
  },
];

export async function run(ctx: GateContext): Promise<GateResult> {
  const start = Date.now();
  const details: GateDetail[] = [];
  const criticalFindings: GateDetail[] = [];

  const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx}");

  for await (const file of glob.scan({ cwd: ctx.cwd, absolute: true })) {
    if (shouldIgnoreFile(file)) continue;
    const content = await Bun.file(file).text().catch(() => "");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      for (const rule of SAST_RULES) {
        if (rule.pattern.test(line)) {
          const finding: GateDetail = {
            severity: rule.severity,
            message: `[${rule.id}] ${rule.message}`,
            location: `${file}:${i + 1}`,
          };
          details.push(finding);
          if (rule.severity === "error") criticalFindings.push(finding);
        }
      }
    }
  }

  if (details.length === 0) {
    details.push({ severity: "info", message: "SAST: No findings" });
  }

  return {
    name: "security-sast",
    ref: ctx.ref,
    passed: criticalFindings.length === 0,
    details,
    durationMs: Date.now() - start,
  };
}

function shouldIgnoreFile(file: string): boolean {
  return file.includes("node_modules")
    || file.includes(".git")
    || file.includes("/tests/")
    || file.includes("/gates/")
    || file.endsWith(".test.ts")
    || file.endsWith(".test.tsx")
    || file.endsWith(".test.js")
    || file.endsWith(".test.jsx");
}
