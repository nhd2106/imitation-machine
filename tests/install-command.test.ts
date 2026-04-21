import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const ROOT = process.cwd();
const PACKAGE_JSON_PATH = join(ROOT, "package.json");

type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

async function runCli(args: string[], env: Record<string, string> = {}): Promise<CommandResult> {
  const proc = Bun.spawn([process.execPath, "cli/index.ts", ...args], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      AGENTIC_DB_PATH: join(ROOT, ".tmp-install-command.db"),
      ...env,
    },
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
}

describe("install command", () => {
  test("top-level help lists install", async () => {
    const result = await runCli(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("install   Install local development integrations");
  });

  test("bare local install defaults to all supported local install surfaces during dry-run", async () => {
    const result = await runCli(["install", "local", "--dry-run"]);

    expect(result.exitCode).toBe(0);
    const opencodePath = join(ROOT, "scripts", "install-local-opencode.sh");
    const claudePath = join(ROOT, "scripts", "install-local-claude-plugin.sh");
    const codexPath = join(ROOT, "scripts", "install-local-codex.sh");

    expect(result.stdout).toContain(`opencode: ${opencodePath}`);
    expect(result.stdout).toContain(`claude: ${claudePath}`);
    expect(result.stdout).toContain(`codex: ${codexPath}`);
    expect(result.stdout.indexOf(opencodePath)).toBeLessThan(result.stdout.indexOf(claudePath));
    expect(result.stdout.indexOf(claudePath)).toBeLessThan(result.stdout.indexOf(codexPath));
  });

  test("install with no subcommand shows install-specific usage", async () => {
    const result = await runCli(["install"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("agentic install — Install local development integrations");
    expect(result.stdout).toContain("default: opencode, claude, codex");
    expect(result.stdout).not.toContain("use codex explicitly");
    expect(result.stdout).not.toContain("agentic — Enterprise Agentic Software-Dev Framework");
    expect(result.stderr).toBe("");
  });

  test("install help does not depend on database startup", async () => {
    const result = await runCli(["install", "--help"], {
      AGENTIC_DB_PATH: "/dev/null/install-help.db",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("agentic install — Install local development integrations");
    expect(result.stdout).toContain("default: opencode, claude, codex");
    expect(result.stdout).not.toContain("use codex explicitly");
    expect(result.stderr).toBe("");
  });

  test("install dry-run does not depend on database startup", async () => {
    const result = await runCli(["install", "local", "--dry-run"], {
      AGENTIC_DB_PATH: "/dev/null/install-dry-run.db",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`opencode: ${join(ROOT, "scripts", "install-local-opencode.sh")}`);
    expect(result.stdout).toContain(`claude: ${join(ROOT, "scripts", "install-local-claude-plugin.sh")}`);
    expect(result.stdout).toContain(`codex: ${join(ROOT, "scripts", "install-local-codex.sh")}`);
    expect(result.stderr).toBe("");
  });

  test("dry-run with opencode surface prints the OpenCode install script path", async () => {
    const result = await runCli(["install", "local", "--surface", "opencode", "--dry-run"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`opencode: ${join(ROOT, "scripts", "install-local-opencode.sh")}`);
    expect(result.stdout).not.toContain("claude:");
  });

  test("dry-run with claude surface prints the Claude plugin install script path", async () => {
    const result = await runCli(["install", "local", "--surface", "claude", "--dry-run"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`claude: ${join(ROOT, "scripts", "install-local-claude-plugin.sh")}`);
    expect(result.stdout).not.toContain("opencode:");
  });

  test("dry-run with codex surface prints the Codex install script path", async () => {
    const result = await runCli(["install", "local", "--surface", "codex", "--dry-run"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`codex: ${join(ROOT, "scripts", "install-local-codex.sh")}`);
    expect(result.stdout).not.toContain("opencode:");
    expect(result.stdout).not.toContain("claude:");
  });

  test("dry-run with all surfaces includes every supported local install surface in stable order", async () => {
    const result = await runCli(["install", "local", "--surface", "all", "--dry-run"]);

    expect(result.exitCode).toBe(0);

    const opencodePath = join(ROOT, "scripts", "install-local-opencode.sh");
    const claudePath = join(ROOT, "scripts", "install-local-claude-plugin.sh");
    const codexPath = join(ROOT, "scripts", "install-local-codex.sh");

    expect(result.stdout).toContain(`opencode: ${opencodePath}`);
    expect(result.stdout).toContain(`claude: ${claudePath}`);
    expect(result.stdout).toContain(`codex: ${codexPath}`);
    expect(result.stdout.indexOf(opencodePath)).toBeLessThan(result.stdout.indexOf(claudePath));
    expect(result.stdout.indexOf(claudePath)).toBeLessThan(result.stdout.indexOf(codexPath));
  });

  test("invalid install arguments show install-specific usage instead of fatal handler output", async () => {
    const result = await runCli(["install", "local", "--surface", "nope"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unsupported --surface value: nope");
    expect(result.stderr).toContain("agentic install — Install local development integrations");
    expect(result.stderr).not.toContain("Fatal error:");
  });

  test("unknown install subcommands show install-specific error and usage without fatal output", async () => {
    const result = await runCli(["install", "nope"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown install subcommand: nope");
    expect(result.stderr).toContain("agentic install — Install local development integrations");
    expect(result.stderr).not.toContain("Fatal error:");
  });

  test("missing install flag values show install-specific usage", async () => {
    const result = await runCli(["install", "local", "--surface"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Missing value for --surface.");
    expect(result.stderr).toContain("agentic install — Install local development integrations");
    expect(result.stderr).not.toContain("Fatal error:");
  });

  test("unknown local install flags show install-specific error and usage", async () => {
    const result = await runCli(["install", "local", "--bogus"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown option for install local: --bogus");
    expect(result.stderr).toContain("agentic install — Install local development integrations");
    expect(result.stderr).not.toContain("Fatal error:");
  });

  test("package ships local install scripts", async () => {
    const packageJson = await Bun.file(PACKAGE_JSON_PATH).json() as { bin?: Record<string, string>; files?: string[] };

    expect(packageJson.bin?.agentic).toBe("./bin/agentic");
    expect(packageJson.files).toContain("scripts/install-local-*.sh");
    expect(packageJson.files).toContain("CODEX_INSTALL.md");
  });

  test("readme distinguishes published package assets from repo-only verification assets", async () => {
    const readme = await Bun.file(join(ROOT, "README.md")).text();

    expect(readme).toContain("Published package assets include the `agentic` launcher, local install helper scripts, packaged plugin assets, and the `skills/` tree.");
    expect(readme).toContain("Repo-only contributor assets include checked-in `tests/`, harness scripts, and other verification helpers used from a source checkout.");
  });

  test("readme is the single install hub with Codex listed as a supported local install surface", async () => {
    const readme = await Bun.file(join(ROOT, "README.md")).text();

    expect(readme).toContain("## Install");
    expect(readme).toContain("| Client | Recommended path | Manual fallback | Exact instructions | Support status / notes |");
    expect(readme).toContain("| OpenCode |");
    expect(readme).toContain("`agentic install local --surface opencode`");
    expect(readme).toContain("[`.opencode/INSTALL.md`](.opencode/INSTALL.md)");
    expect(readme).toContain("Supported packaged local install");
    expect(readme).toContain("| Claude |");
    expect(readme).toContain("`agentic install local --surface claude`");
    expect(readme).toContain("[`CLAUDE_INSTALL.md`](CLAUDE_INSTALL.md)");
    expect(readme).toContain("Claude development marketplace");
    expect(readme).toContain("| Codex |");
    expect(readme).toContain("`agentic install local --surface codex`");
    expect(readme).toContain("[`CODEX_INSTALL.md`](CODEX_INSTALL.md)");
    expect(readme).toContain("Supported local install surface");
    expect(readme).toContain("skills-only");
    expect(readme).toContain("no plugin integration");
    expect(readme).toContain("no bootstrap injection");
    expect(readme).toContain("no live Codex harness claim");
    expect(readme).toContain("| Cursor |");
    expect(readme).toContain("| Gemini |");
    expect(readme).toContain("Not currently supported");
  });

  test("codex install doc stays truthful about supported skills-only install limits", async () => {
    const codexDoc = await Bun.file(join(ROOT, "CODEX_INSTALL.md")).text();

    expect(codexDoc).toContain("supported local install surface");
    expect(codexDoc).toContain("skills-only");
    expect(codexDoc).toContain("agentic install local --surface codex");
    expect(codexDoc).toContain("./scripts/install-local-codex.sh");
    expect(codexDoc).toContain("no plugin integration");
    expect(codexDoc).toContain("no bootstrap injection");
    expect(codexDoc).toContain("no live Codex harness claim");
    expect(codexDoc).not.toContain("experimental");
  });

  test("codex verification docs describe the supported installer lane and current limits", async () => {
    const codexReadme = await Bun.file(join(ROOT, "tests", "codex", "README.md")).text();

    expect(codexReadme).toContain("supported local install surface");
    expect(codexReadme).toContain("bun run test:codex");
    expect(codexReadme).toContain("CODEX_AGENTS_DIR");
    expect(codexReadme).toContain("skills/imitation-machine");
    expect(codexReadme).toContain("no plugin integration");
    expect(codexReadme).toContain("no bootstrap injection");
    expect(codexReadme).toContain("no live Codex harness claim");
  });

  test("codex install script links the skills bundle into the user agents directory", async () => {
    const script = await Bun.file(join(ROOT, "scripts", "install-local-codex.sh")).text();

    expect(script).toContain('AGENTS_DIR="${CODEX_AGENTS_DIR:-$HOME/.agents}"');
    expect(script).toContain('SKILLS_DIR="$AGENTS_DIR/skills"');
    expect(script).toContain('ln -sfn "$REPO_ROOT/skills" "$SKILLS_DIR/imitation-machine"');
  });

  test("packaged opencode install docs prefer agentic local install with script fallback", async () => {
    const installDoc = await Bun.file(join(ROOT, ".opencode", "INSTALL.md")).text();

    expect(installDoc).toContain("agentic install local --surface opencode");
    expect(installDoc).toContain("./scripts/install-local-opencode.sh");
    expect(installDoc.indexOf("agentic install local --surface opencode")).toBeLessThan(
      installDoc.indexOf("./scripts/install-local-opencode.sh"),
    );
  });

  test("opencode install doc labels published-package setup separately from local development", async () => {
    const installDoc = await Bun.file(join(ROOT, ".opencode", "INSTALL.md")).text();

    expect(installDoc).toContain("## Published registry install (not recommended for local development)");
    expect(installDoc).toContain("Use this only after the package is actually published and reachable.");
    expect(installDoc).not.toContain("## Additional notes");
  });

  test("claude manual verification preconditions prefer agentic local install", async () => {
    const claudeReadme = await Bun.file(join(ROOT, "tests", "claude-code", "README.md")).text();

    expect(claudeReadme).toContain("agentic install local --surface claude");
    expect(claudeReadme).toContain("Raw script fallback if needed:");
    expect(claudeReadme.indexOf("agentic install local --surface claude")).toBeLessThan(
      claudeReadme.indexOf("./scripts/install-local-claude-plugin.sh"),
    );
  });

  test("surface install docs match the README recommended-path wording", async () => {
    const [opencodeDoc, claudeDoc] = await Promise.all([
      Bun.file(join(ROOT, ".opencode", "INSTALL.md")).text(),
      Bun.file(join(ROOT, "CLAUDE_INSTALL.md")).text(),
    ]);

    expect(opencodeDoc).toContain("## Recommended path");
    expect(opencodeDoc).toContain("## Manual fallback");
    expect(opencodeDoc).not.toContain("## Option A:");

    expect(claudeDoc).toContain("## Recommended path");
    expect(claudeDoc).toContain("## Manual fallback");
    expect(claudeDoc).not.toContain("## Local install (recommended while iterating)");
  });

  test("claude install troubleshooting prefers rerunning agentic local install before manual inspection", async () => {
    const claudeDoc = await Bun.file(join(ROOT, "CLAUDE_INSTALL.md")).text();

    expect(claudeDoc).toContain("If the skills do not appear, first re-run:");
    expect(claudeDoc).toContain("agentic install local --surface claude");
    expect(claudeDoc).toContain("If that still fails, inspect the symlinks in `~/.claude/skills/`");
    expect(claudeDoc.indexOf("If the skills do not appear, first re-run:")).toBeLessThan(
      claudeDoc.indexOf("If that still fails, inspect the symlinks in `~/.claude/skills/`"),
    );
  });

  test("opencode verification distinguishes installed-user checks from repo-checkout verification", async () => {
    const readme = await Bun.file(join(ROOT, "README.md")).text();

    expect(readme).toContain("## OpenCode verification");
    expect(readme).toContain("### Installed-user verification");
    expect(readme).toContain("### Repo-checkout / plugin-development verification");
    expect(readme).toContain("~/.config/opencode/plugins/imitation-machine.js");
    expect(readme).toContain("~/.config/opencode/skills/imitation-machine");
  });
});
