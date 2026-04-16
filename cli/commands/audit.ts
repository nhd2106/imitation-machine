import { db } from "../../db/client";
import { requirements, plans, agentRuns, gateResults, approvals } from "../../db/schema";
import { gte } from "drizzle-orm";

const AUDIT_USAGE = `
agentic audit — Audit trail and compliance export

USAGE
  agentic audit trace --id <req-id>     Full traceability chain for a requirement
  agentic audit export --since <date>   Export audit log as JSONL (ISO date)
`.trim();

export async function auditCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help") {
    console.log(AUDIT_USAGE);
    return;
  }

  switch (args[0]) {
    case "trace":  return auditTrace(args.slice(1));
    case "export": return auditExport(args.slice(1));
    default:
      console.error(`Unknown audit subcommand: ${args[0]}`);
      process.exit(1);
  }
}

async function auditTrace(args: string[]): Promise<void> {
  // Delegate to requirement trace — same view
  const { requirementCommand } = await import("./requirement");
  return requirementCommand(["trace", ...args]);
}

async function auditExport(args: string[]): Promise<void> {
  const since = getFlag(args, "--since");
  if (!since) { console.error("Required: --since <ISO date>"); process.exit(1); }

  const rows = [
    ...db.select().from(requirements).where(gte(requirements.createdAt, since)).all()
      .map((r) => ({ type: "requirement", ...r })),
    ...db.select().from(plans).where(gte(plans.createdAt, since)).all()
      .map((r) => ({ type: "plan", ...r })),
    ...db.select().from(agentRuns).where(gte(agentRuns.startedAt, since)).all()
      .map((r) => ({ type: "agent_run", ...r })),
    ...db.select().from(gateResults).where(gte(gateResults.ranAt, since)).all()
      .map((r) => ({ type: "gate_result", ...r })),
    ...db.select().from(approvals).where(gte(approvals.approvedAt, since)).all()
      .map((r) => ({ type: "approval", ...r })),
  ];

  // Sort chronologically
  rows.sort((a, b) => {
    const aTime = getTime(a);
    const bTime = getTime(b);
    return aTime.localeCompare(bTime);
  });

  for (const row of rows) {
    process.stdout.write(JSON.stringify(row) + "\n");
  }
}

function getTime(row: Record<string, unknown>): string {
  return (
    (row["createdAt"] as string | undefined) ??
    (row["startedAt"] as string | undefined) ??
    (row["ranAt"] as string | undefined) ??
    (row["approvedAt"] as string | undefined) ??
    ""
  );
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx === -1 ? undefined : args[idx + 1];
}
