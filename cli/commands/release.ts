import { recordApproval } from "../../audit/approvals";

const RELEASE_USAGE = `
agentic release — Release workflow

USAGE
  agentic release tag --version <version> --by <approver> [--cwd <path>] [--push]
`.trim();

export async function releaseCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(RELEASE_USAGE);
    return;
  }

  switch (args[0]) {
    case "tag":
      await releaseTag(args.slice(1));
      return;
    default:
      console.error(`Unknown release subcommand: ${args[0]}`);
      process.exit(1);
  }
}

async function releaseTag(args: string[]): Promise<void> {
  const version = getFlag(args, "--version");
  const by = getFlag(args, "--by");
  const cwd = getFlag(args, "--cwd") ?? process.cwd();
  const push = args.includes("--push");

  if (!version || !by) {
    console.error("Required: --version <version> --by <approver>");
    process.exit(1);
  }

  const tag = version.startsWith("v") ? version : `v${version}`;
  await runOrExit(["git", "tag", "-a", tag, "-m", `Release ${tag}`], cwd);

  if (push) {
    await runOrExit(["git", "push", "origin", tag], cwd);
  }

  const approvalId = await recordApproval("release", tag, by);
  console.log(`✓ Release tag created: ${tag}`);
  console.log(`✓ Release approval recorded: ${approvalId}`);
}

async function runOrExit(cmd: string[], cwd: string): Promise<void> {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  const output = (stdout + stderr).trim();
  if (output) console.log(output);

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  return args[idx + 1];
}
