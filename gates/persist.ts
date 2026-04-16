import { db } from "../db/client";
import { gateResults } from "../db/schema";
import type { GateResult } from "./types";

export function persistGateResult(result: GateResult): void {
  const id = `GATE-${crypto.randomUUID()}`;
  db.insert(gateResults).values({
    id,
    gateName: result.name,
    ref: result.ref,
    passed: result.passed,
    detailsJson: JSON.stringify(result.details),
    ranAt: new Date().toISOString(),
  }).run();
}
