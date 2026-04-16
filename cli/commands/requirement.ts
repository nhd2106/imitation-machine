import { db } from "../../db/client";
import { requirements, plans, agentRuns, gateResults } from "../../db/schema";
import { eq } from "drizzle-orm";

const REQ_USAGE = `
agentic req — Manage requirements

USAGE
  agentic req new  --text <text> --criteria <criteria>
  agentic req list
  agentic req trace --id <req-id>
`.trim();

export async function requirementCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help") {
    console.log(REQ_USAGE);
    return;
  }

  switch (args[0]) {
    case "new":   return reqNew(args.slice(1));
    case "list":  return reqList();
    case "trace": return reqTrace(args.slice(1));
    default:
      console.error(`Unknown req subcommand: ${args[0]}`);
      process.exit(1);
  }
}

async function reqNew(args: string[]): Promise<void> {
  const text = getFlag(args, "--text");
  const criteria = getFlag(args, "--criteria");
  if (!text || !criteria) {
    console.error("Required: --text <text> --criteria <criteria>");
    process.exit(1);
  }

  const id = `REQ-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.insert(requirements).values({
    id,
    text,
    acceptanceCriteria: criteria,
    status: "open",
    sourceType: "manual",
    createdAt: now,
    updatedAt: now,
  }).run();

  console.log(`Requirement created: ${id}`);
}

async function reqList(): Promise<void> {
  const rows = db.select().from(requirements).all();
  if (rows.length === 0) { console.log("No requirements found."); return; }

  console.log(`${"ID".padEnd(16)} ${"STATUS".padEnd(10)} TEXT`);
  console.log("─".repeat(70));
  for (const row of rows) {
    const preview = row.text.slice(0, 50) + (row.text.length > 50 ? "…" : "");
    console.log(`${row.id.padEnd(16)} ${row.status.padEnd(10)} ${preview}`);
  }
}

async function reqTrace(args: string[]): Promise<void> {
  const id = getFlag(args, "--id");
  if (!id) { console.error("Required: --id <req-id>"); process.exit(1); }

  const req = db.select().from(requirements).where(eq(requirements.id, id)).all()[0];
  if (!req) { console.error(`Requirement not found: ${id}`); process.exit(1); }

  console.log(`\n── Requirement: ${req.id}`);
  console.log(`   ${req.text}`);
  console.log(`   Criteria: ${req.acceptanceCriteria}`);
  console.log(`   Status: ${req.status}`);

  const relatedPlans = db.select().from(plans).where(eq(plans.requirementId, id)).all();
  for (const plan of relatedPlans) {
    console.log(`\n   └─ Plan: ${plan.id} [${plan.status}] "${plan.title}"`);
    if (plan.branch) console.log(`      Branch: ${plan.branch}`);

    const runs = db.select().from(agentRuns).where(eq(agentRuns.planId, plan.id)).all();
    for (const run of runs) {
      console.log(`\n      └─ Agent Run: ${run.id} (${run.persona}) [${run.status}]`);
      if (run.taskId) console.log(`         Task: ${run.taskId}`);
      if (run.durationMs) console.log(`         Duration: ${run.durationMs}ms`);

      const gates = db.select().from(gateResults).where(eq(gateResults.ref, run.taskId ?? run.id)).all();
      for (const gate of gates) {
        const icon = gate.passed ? "✓" : "✗";
        console.log(`\n         └─ Gate: ${icon} ${gate.gateName} @ ${gate.ranAt}`);
      }
    }
  }
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx === -1 ? undefined : args[idx + 1];
}
