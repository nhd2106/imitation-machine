import { db } from "./client";
import { sql } from "drizzle-orm";

export async function migrate(): Promise<void> {
  db.run(sql`
    CREATE TABLE IF NOT EXISTS ae_requirements (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      acceptance_criteria TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      po_approved_at TEXT,
      source_type TEXT NOT NULL DEFAULT 'manual',
      source_chat_id TEXT,
      source_message_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS ae_plans (
      id TEXT PRIMARY KEY,
      requirement_id TEXT NOT NULL,
      title TEXT NOT NULL,
      tasks_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      approved_by TEXT,
      approved_at TEXT,
      worktree_path TEXT,
      branch TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS ae_agent_runs (
      id TEXT PRIMARY KEY,
      persona TEXT NOT NULL,
      plan_id TEXT,
      task_id TEXT,
      session_id TEXT,
      inputs_json TEXT NOT NULL,
      outputs_json TEXT,
      status TEXT NOT NULL DEFAULT 'running',
      duration_ms INTEGER,
      error TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS ae_gate_results (
      id TEXT PRIMARY KEY,
      gate_name TEXT NOT NULL,
      ref TEXT NOT NULL,
      passed INTEGER NOT NULL,
      details_json TEXT NOT NULL,
      ran_at TEXT NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS ae_approvals (
      id TEXT PRIMARY KEY,
      artifact_type TEXT NOT NULL,
      artifact_id TEXT NOT NULL,
      approver TEXT NOT NULL,
      approved_at TEXT NOT NULL,
      signature TEXT NOT NULL
    )
  `);

  db.run(sql`CREATE INDEX IF NOT EXISTS idx_ae_plans_requirement_id ON ae_plans(requirement_id)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_ae_agent_runs_plan_id ON ae_agent_runs(plan_id)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_ae_agent_runs_task_id ON ae_agent_runs(task_id)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_ae_gate_results_ref ON ae_gate_results(ref)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_ae_gate_results_name_ref ON ae_gate_results(gate_name, ref)`);
}
