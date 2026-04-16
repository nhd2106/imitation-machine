import type { GateContext, GateResult, GateDetail } from "./types";
import { db } from "../db/client";
import { gateResults } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Spec compliance gate (Stage 1 review).
 * Passes if a Code Reviewer agent has marked spec compliance as approved
 * for the given task ref in the gate_results table.
 */
export async function run(ctx: GateContext): Promise<GateResult> {
  const start = Date.now();
  const details: GateDetail[] = [];

  const latest = db
    .select()
    .from(gateResults)
    .where(and(eq(gateResults.gateName, "spec"), eq(gateResults.ref, ctx.ref)))
    .orderBy(desc(gateResults.ranAt))
    .limit(1)
    .all();

  const record = latest[0];

  if (!record || record === undefined) {
    details.push({
      severity: "error",
      message: `No spec compliance review found for ref "${ctx.ref}". Run /review spec first.`,
    });
    return { name: "spec", ref: ctx.ref, passed: false, details, durationMs: Date.now() - start };
  }

  const passed = Boolean(record.passed);
  const recordDetails = JSON.parse(record.detailsJson) as GateDetail[];

  details.push(...recordDetails);
  details.push({
    severity: passed ? "info" : "error",
    message: `Spec review recorded at ${record.ranAt}: ${passed ? "PASSED" : "FAILED"}`,
  });

  return { name: "spec", ref: ctx.ref, passed, details, durationMs: Date.now() - start };
}
