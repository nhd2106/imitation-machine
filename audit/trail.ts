import { db } from "../db/client";
import { agentRuns } from "../db/schema";
import type { PersonaId } from "../agents/types";
import { eq } from "drizzle-orm";

export type AgentRunInput = {
  persona: PersonaId;
  planId?: string;
  taskId?: string;
  sessionId?: string;
  inputs: Record<string, unknown>;
};

export type AgentRunHandle = {
  id: string;
  complete: (outputs: Record<string, unknown>) => void;
  fail: (error: string) => void;
};

export function startAgentRun(input: AgentRunInput): AgentRunHandle {
  const id = `RUN-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  db.insert(agentRuns).values({
    id,
    persona: input.persona,
    planId: input.planId,
    taskId: input.taskId,
    sessionId: input.sessionId,
    inputsJson: JSON.stringify(input.inputs),
    status: "running",
    startedAt: now,
  }).run();

  const startMs = Date.now();

  return {
    id,
    complete(outputs) {
      db.update(agentRuns)
        .set({
          status: "completed",
          outputsJson: JSON.stringify(outputs),
          durationMs: Date.now() - startMs,
          completedAt: new Date().toISOString(),
        })
        .where(eq(agentRuns.id, id))
        .run();
    },
    fail(error) {
      db.update(agentRuns)
        .set({
          status: "failed",
          error,
          durationMs: Date.now() - startMs,
          completedAt: new Date().toISOString(),
        })
        .where(eq(agentRuns.id, id))
        .run();
    },
  };
}
