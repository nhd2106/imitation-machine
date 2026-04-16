import { join } from "node:path";
import { readdir } from "node:fs/promises";

type Severity = "fail" | "warn" | "pass";

export type PluginCheck = {
  id: string;
  severity: Severity;
  message: string;
};

export type PluginCheckReport = {
  cwd: string;
  passed: boolean;
  checks: PluginCheck[];
};

type ClaudePluginManifest = {
  name?: string;
  version?: string;
  author?: { name?: string };
  skills?: unknown;
};

type PackageJson = {
  main?: string;
  files?: string[];
};

const USAGE = `
agentic check-plugin — Validate OpenCode + Claude plugin packaging

USAGE
  agentic check-plugin [--cwd <path>] [--json]

VALIDATES
  - OpenCode plugin entrypoint exists
  - Claude plugin manifest exists and all skill paths resolve
  - package.json main/files include required plugin artifacts
`.trim();

export async function checkPluginCommand(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    return;
  }

  const cwd = getFlag(args, "--cwd") ?? process.cwd();
  const asJson = args.includes("--json");
  const report = await validatePluginSetup(cwd);

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }

  process.exit(report.passed ? 0 : 1);
}

export async function validatePluginSetup(cwd: string): Promise<PluginCheckReport> {
  const checks: PluginCheck[] = [];

  await checkRequiredFiles(cwd, checks);
  await checkPackageJson(cwd, checks);
  await checkClaudeManifest(cwd, checks);
  await checkOpenCodeProjectConfig(cwd, checks);

  const passed = !checks.some((check) => check.severity === "fail");
  return { cwd, passed, checks };
}

async function checkRequiredFiles(cwd: string, checks: PluginCheck[]): Promise<void> {
  const required = [
    ".opencode/plugins/imitation-machine.js",
    ".claude-plugin/plugin.json",
    "skills/using-agentic/SKILL.md",
    "bin/agentic",
    "package.json",
  ];

  for (const relPath of required) {
    const exists = await Bun.file(join(cwd, relPath)).exists();
    checks.push({
      id: `required:${relPath}`,
      severity: exists ? "pass" : "fail",
      message: exists ? `Found ${relPath}` : `Missing required file: ${relPath}`,
    });
  }
}

async function checkPackageJson(cwd: string, checks: PluginCheck[]): Promise<void> {
  const packagePath = join(cwd, "package.json");
  const pkgFile = Bun.file(packagePath);
  if (!(await pkgFile.exists())) return;

  let parsed: PackageJson;
  try {
    parsed = await pkgFile.json() as PackageJson;
  } catch {
    checks.push({
      id: "package:parse",
      severity: "fail",
      message: "package.json is not valid JSON",
    });
    return;
  }

  const expectedMain = ".opencode/plugins/imitation-machine.js";
  checks.push({
    id: "package:main",
    severity: parsed.main === expectedMain ? "pass" : "fail",
    message: parsed.main === expectedMain
      ? `package.json main is ${expectedMain}`
      : `package.json main should be ${expectedMain}`,
  });

  const files = parsed.files ?? [];
  for (const requiredGlob of [".opencode/**", ".claude-plugin/**", "skills/**"]) {
    const ok = files.includes(requiredGlob);
    checks.push({
      id: `package:files:${requiredGlob}`,
      severity: ok ? "pass" : "warn",
      message: ok
        ? `package.json files includes ${requiredGlob}`
        : `package.json files should include ${requiredGlob}`,
    });
  }
}

async function checkClaudeManifest(cwd: string, checks: PluginCheck[]): Promise<void> {
  const manifestPath = join(cwd, ".claude-plugin/plugin.json");
  const file = Bun.file(manifestPath);
  if (!(await file.exists())) return;

  let manifest: ClaudePluginManifest;
  try {
    manifest = await file.json() as ClaudePluginManifest;
  } catch {
    checks.push({
      id: "claude:parse",
      severity: "fail",
      message: ".claude-plugin/plugin.json is not valid JSON",
    });
    return;
  }

  checks.push({
    id: "claude:author-object",
    severity: manifest.author && typeof manifest.author === "object" ? "pass" : "fail",
    message: manifest.author && typeof manifest.author === "object"
      ? "Claude manifest author is an object"
      : "Claude manifest author must be an object (e.g. { \"name\": \"...\" })",
  });

  checks.push({
    id: "claude:skills-field",
    severity: manifest.skills === undefined ? "pass" : "warn",
    message: manifest.skills === undefined
      ? "Claude manifest omits skills field (recommended)"
      : "Claude manifest includes skills field; prefer auto-discovery from skills/ directory",
  });

  const skills = await discoverSkills(cwd);
  checks.push({
    id: "claude:skills-present",
    severity: skills.length > 0 ? "pass" : "fail",
    message: skills.length > 0
      ? `Discovered ${skills.length} skills from skills/ directory`
      : "No skills discovered in skills/ directory",
  });

  const seen = new Set<string>();
  for (const skill of skills) {
    const name = skill.name;
    const path = skill.path;

    if (!name) {
      checks.push({
        id: "claude:skill-name",
        severity: "fail",
        message: "A Claude skill entry is missing a name",
      });
      continue;
    }

    if (seen.has(name)) {
      checks.push({
        id: `claude:duplicate:${name}`,
        severity: "fail",
        message: `Duplicate Claude skill name: ${name}`,
      });
    }
    seen.add(name);

    const fullPath = join(cwd, path);
    const exists = path ? await Bun.file(fullPath).exists() : false;
    checks.push({
      id: `claude:skill-path:${name}`,
      severity: exists ? "pass" : "fail",
      message: exists
        ? `Skill ${name} path exists: ${path}`
        : `Skill ${name} path missing: ${path}`,
    });
  }
}

async function discoverSkills(cwd: string): Promise<Array<{ name: string; path: string }>> {
  const skillsRoot = join(cwd, "skills");
  let entries;
  try {
    entries = await readdir(skillsRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  const discovered: Array<{ name: string; path: string }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    const skillPath = join("skills", name, "SKILL.md");
    const exists = await Bun.file(join(cwd, skillPath)).exists();
    if (exists) {
      discovered.push({ name, path: skillPath });
    }
  }

  return discovered;
}

async function checkOpenCodeProjectConfig(cwd: string, checks: PluginCheck[]): Promise<void> {
  const localConfigPath = join(cwd, ".opencode/opencode.json");
  const file = Bun.file(localConfigPath);
  if (!(await file.exists())) {
    checks.push({
      id: "opencode:project-config",
      severity: "warn",
      message: "No .opencode/opencode.json found (project-local plugin pin recommended)",
    });
    return;
  }

  checks.push({
    id: "opencode:project-config",
    severity: "pass",
    message: "Found .opencode/opencode.json",
  });
}

function printReport(report: PluginCheckReport): void {
  console.log(`Plugin check for: ${report.cwd}`);
  for (const check of report.checks) {
    const icon = check.severity === "pass" ? "✓" : check.severity === "warn" ? "!" : "✗";
    console.log(`${icon} [${check.severity}] ${check.message}`);
  }
  console.log(`\n${report.passed ? "✓ Plugin checks passed" : "✗ Plugin checks failed"}`);
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx === -1 ? undefined : args[idx + 1];
}
