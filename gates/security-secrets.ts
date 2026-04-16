import type { GateContext, GateResult, GateDetail } from "./types";

// Secret patterns: API keys, tokens, private keys, connection strings
const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "Generic API key", pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["']?[A-Za-z0-9_\-]{20,}/i },
  { name: "Bearer token", pattern: /bearer\s+[A-Za-z0-9_\-.+/]{20,}/i },
  { name: "Private key header", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "AWS access key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "Generic secret", pattern: /(?:secret|password|passwd|pwd)\s*[:=]\s*["'][^\s"']{8,}["']/i },
  { name: "Connection string", pattern: /(?:postgres|mysql|mongodb|redis):\/\/[^:\s]+:[^@\s]+@/ },
];

export async function run(ctx: GateContext): Promise<GateResult> {
  const start = Date.now();
  const details: GateDetail[] = [];

  const glob = new Bun.Glob("**/*.{ts,js,json,env,yaml,yml}");
  const findings: GateDetail[] = [];

  for await (const file of glob.scan({ cwd: ctx.cwd, absolute: true })) {
    if (shouldIgnoreFile(file)) continue;
    const content = await Bun.file(file).text().catch(() => "");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      for (const { name, pattern } of SECRET_PATTERNS) {
        if (pattern.test(line)) {
          findings.push({
            severity: "error",
            message: `Potential ${name} found`,
            location: `${file}:${i + 1}`,
          });
        }
      }
    }
  }

  if (findings.length === 0) {
    details.push({ severity: "info", message: "No secrets detected" });
  } else {
    details.push(...findings);
  }

  return {
    name: "security-secrets",
    ref: ctx.ref,
    passed: findings.length === 0,
    details,
    durationMs: Date.now() - start,
  };
}

function shouldIgnoreFile(file: string): boolean {
  return file.includes("node_modules")
    || file.includes(".git")
    || file.includes("/tests/")
    || file.includes("/gates/");
}
