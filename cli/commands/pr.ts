import { recordApproval } from "../../audit/approvals";

const PR_USAGE = `
agentic pr — Pull request workflow

USAGE
  agentic pr open --title <title> --body <body> [--base <branch>] [--head <branch>] [--cwd <path>]
  agentic pr approve --id <pr-id> --by <approver>
`.trim();

export async function prCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(PR_USAGE);
    return;
  }

  switch (args[0]) {
    case "open":
      await prOpen(args.slice(1));
      return;
    case "approve":
      await prApprove(args.slice(1));
      return;
    default:
      console.error(`Unknown pr subcommand: ${args[0]}`);
      process.exit(1);
  }
}

async function prOpen(args: string[]): Promise<void> {
  const title = getFlag(args, "--title");
  const body = getFlag(args, "--body");
  const base = getFlag(args, "--base");
  const head = getFlag(args, "--head");
  const cwd = getFlag(args, "--cwd") ?? process.cwd();

  if (!title || !body) {
    console.error("Required: --title <title> --body <body>");
    process.exit(1);
  }

  const cmd = ["gh", "pr", "create", "--title", title, "--body", body];
  if (base) cmd.push("--base", base);
  if (head) cmd.push("--head", head);

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

async function prApprove(args: string[]): Promise<void> {
  const id = getFlag(args, "--id");
  const by = getFlag(args, "--by");

  if (!id || !by) {
    console.error("Required: --id <pr-id> --by <approver>");
    process.exit(1);
  }

  const approvalId = await recordApproval("pr", id, by);
  console.log(`✓ PR approval recorded: ${approvalId}`);
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  return args[idx + 1];
}
