import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ── Requirements ─────────────────────────────────────────────────────────────
export const requirements = sqliteTable("ae_requirements", {
  id: text("id").primaryKey(), // REQ-<uuid>
  text: text("text").notNull(),
  acceptanceCriteria: text("acceptance_criteria").notNull(),
  status: text("status").notNull().default("open"), // open | approved | closed
  poApprovedAt: text("po_approved_at"),
  sourceType: text("source_type").notNull().default("manual"), // manual | chat
  sourceChatId: text("source_chat_id"),
  sourceMessageId: text("source_message_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ── Plans ─────────────────────────────────────────────────────────────────────
export const plans = sqliteTable("ae_plans", {
  id: text("id").primaryKey(), // PLN-<uuid>
  requirementId: text("requirement_id").notNull(),
  title: text("title").notNull(),
  tasksJson: text("tasks_json").notNull(), // JSON: PlanTask[]
  status: text("status").notNull().default("draft"), // draft | approved | executing | done
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),
  worktreePath: text("worktree_path"),
  branch: text("branch"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ── Agent Runs ────────────────────────────────────────────────────────────────
export const agentRuns = sqliteTable("ae_agent_runs", {
  id: text("id").primaryKey(), // RUN-<uuid>
  persona: text("persona").notNull(), // architect | planner | coder | qa | security | reviewer | docs | release | po
  planId: text("plan_id"),
  taskId: text("task_id"), // TSK-<uuid> (from plan tasks_json)
  sessionId: text("session_id"),
  inputsJson: text("inputs_json").notNull(),
  outputsJson: text("outputs_json"),
  status: text("status").notNull().default("running"), // running | completed | failed
  durationMs: integer("duration_ms"),
  error: text("error"),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
});

// ── Gate Results ──────────────────────────────────────────────────────────────
export const gateResults = sqliteTable("ae_gate_results", {
  id: text("id").primaryKey(), // GATE-<uuid>
  gateName: text("gate_name").notNull(), // coverage | typecheck | security-secrets | security-sast | spec | quality | plan
  ref: text("ref").notNull(), // git SHA or plan/task id being gated
  passed: integer("passed", { mode: "boolean" }).notNull(),
  detailsJson: text("details_json").notNull(),
  ranAt: text("ran_at").notNull(),
});

// ── Approvals ─────────────────────────────────────────────────────────────────
export const approvals = sqliteTable("ae_approvals", {
  id: text("id").primaryKey(), // APR-<uuid>
  artifactType: text("artifact_type").notNull(), // plan | pr | release
  artifactId: text("artifact_id").notNull(),
  approver: text("approver").notNull(),
  approvedAt: text("approved_at").notNull(),
  signature: text("signature").notNull(), // HMAC(artifactId + approver + approvedAt)
});
