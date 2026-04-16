import type { GateContext, GateResult, GateDetail } from "./types";
import { db } from "../db/client";
import { gateResults } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Code quality gate (Stage 2 review).
 * Only passes if Stage 1 (spec) already passed AND a quality review exists.
 */
export async function run(ctx: GateContext): Promise<GateResult> {
  const start = Date.now();
  const details: GateDetail[] = [];

  // Enforce ordering: spec must pass before quality
  const specRecord = db
    .select()
    .from(gateResults)
    .where(and(eq(gateResults.gateName, "spec"), eq(gateResults.ref, ctx.ref)))
    .orderBy(desc(gateResults.ranAt))
    .limit(1)
    .all()[0];

  if (!specRecord || !Boolean(specRecord.passed)) {
    details.push({
      severity: "error",
      message: `Spec compliance (Stage 1) must pass before quality review (Stage 2). Run /review spec first.`,
    });
    return { name: "quality", ref: ctx.ref, passed: false, details, durationMs: Date.now() - start };
  }

  const qualityRecord = db
    .select()
    .from(gateResults)
    .where(and(eq(gateResults.gateName, "quality"), eq(gateResults.ref, ctx.ref)))
    .orderBy(desc(gateResults.ranAt))
    .limit(1)
    .all()[0];

  if (!qualityRecord) {
    details.push({
      severity: "error",
      message: `No quality review found for ref "${ctx.ref}". Run /review quality first.`,
    });
    return { name: "quality", ref: ctx.ref, passed: false, details, durationMs: Date.now() - start };
  }

  const passed = Boolean(qualityRecord.passed);
  const recordDetails = JSON.parse(qualityRecord.detailsJson) as GateDetail[];
  details.push(...recordDetails);

  return { name: "quality", ref: ctx.ref, passed, details, durationMs: Date.now() - start };
}
