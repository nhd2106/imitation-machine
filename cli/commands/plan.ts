import { db } from "../../db/client";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { plans } from "../../db/schema";
import { eq } from "drizzle-orm";
import * as planGate from "../../gates/plan";
import { persistGateResult } from "../../gates/persist";

const PLAN_USAGE = `
agentic plan — Manage implementation plans

USAGE
  agentic plan new    --req <req-id> --title <title>
  agentic plan verify --id <plan-id>
  agentic plan approve --id <plan-id> --by <approver>
  agentic plan list
`.trim();

export async function planCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help") {
    console.log(PLAN_USAGE);
    return;
  }

  const subcommand = args[0];

  switch (subcommand) {
    case "new":    return planNew(args.slice(1));
    case "verify": return planVerify(args.slice(1));
    case "approve": return planApprove(args.slice(1));
    case "list":   return planList();
    default:
      console.error(`Unknown plan subcommand: ${subcommand}`);
      process.exit(1);
  }
}

async function planNew(args: string[]): Promise<void> {
  const reqId = getFlag(args, "--req");
  const title = getFlag(args, "--title");
  if (!reqId || !title) {
    console.error("Required: --req <req-id> --title <title>");
    process.exit(1);
  }

  const id = `PLN-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.insert(plans).values({
    id,
    requirementId: reqId,
    title,
    tasksJson: "[]",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  }).run();

  await writePlanTemplate(process.cwd(), id, reqId, title);

  console.log(`Plan created: ${id}`);
  console.log(`Edit plans/${id}.json to add tasks, then run: agentic plan verify --id ${id}`);
}

export async function writePlanTemplate(
  cwd: string,
  planId: string,
  requirementId: string,
  title: string,
): Promise<string> {
  const plansDir = join(cwd, "plans");
  const planPath = join(plansDir, `${planId}.json`);

  await mkdir(plansDir, { recursive: true });
  await Bun.write(planPath, JSON.stringify({
    id: planId,
    requirementId,
    title,
    tasks: [],
  }, null, 2));

  return planPath;
}

async function planVerify(args: string[]): Promise<void> {
  const id = getFlag(args, "--id");
  if (!id) { console.error("Required: --id <plan-id>"); process.exit(1); }

  const planPath = `plans/${id}.json`;
  const result = await planGate.run({ ref: id, cwd: process.cwd(), options: { planPath } });
  persistGateResult(result);

  for (const d of result.details) {
    const p = d.severity === "error" ? "✗" : d.severity === "warn" ? "⚠" : "•";
    console.log(`${p} ${d.message}`);
  }
  console.log(`\n${result.passed ? "✓ Plan verified" : "✗ Plan has issues — fix before approving"}`);
  process.exit(result.passed ? 0 : 1);
}

async function planApprove(args: string[]): Promise<void> {
  const id = getFlag(args, "--id");
  const by = getFlag(args, "--by");
  if (!id || !by) { console.error("Required: --id <plan-id> --by <approver>"); process.exit(1); }

  const now = new Date().toISOString();
  db.update(plans)
    .set({ status: "approved", approvedBy: by, approvedAt: now, updatedAt: now })
    .where(eq(plans.id, id))
    .run();

  console.log(`✓ Plan ${id} approved by ${by} at ${now}`);
}

async function planList(): Promise<void> {
  const rows = db.select().from(plans).all();
  if (rows.length === 0) { console.log("No plans found."); return; }

  console.log(`${"ID".padEnd(16)} ${"STATUS".padEnd(12)} TITLE`);
  console.log("─".repeat(60));
  for (const row of rows) {
    console.log(`${row.id.padEnd(16)} ${row.status.padEnd(12)} ${row.title}`);
  }
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx === -1 ? undefined : args[idx + 1];
}
