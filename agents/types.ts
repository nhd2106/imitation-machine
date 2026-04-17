export type PersonaId =
  | "architect"
  | "po"
  | "planner"
  | "coder"
  | "qa"
  | "security"
  | "reviewer"
  | "docs"
  | "release";

export type ToolName =
  | "read"
  | "write"
  | "test_runner"
  | "coverage_cli"
  | "secret_scan"
  | "sast_cli"
  | "diagram_gen"
  | "issue_tracker"
  | "git_ops"
  | "ci_trigger"
  | "worktree_create"
  | "comment";

export type AgentPersona = {
  id: PersonaId;
  name: string;
  responsibility: string;
  promptPrefix: string;
  allowlist: readonly ToolName[];
  /** Personas that must complete before this one can run for the same task */
  dependsOn?: readonly PersonaId[];
  /** Preferred model tier — haiku | sonnet | opus */
  modelTier: "haiku" | "sonnet" | "opus";
};

export type PlanTask = {
  id: string; // TSK-<uuid>
  title: string;
  description: string;
  filePaths: string[];
  verificationCommand: string;
  expectedOutput: string;
  estimatedMinutes: number;
  executionGroupId: string;
  prGroupId: string;
  independence: "independent" | "shared";
  dependsOnTaskIds?: string[];
  status: "pending" | "in_progress" | "completed" | "failed";
};

export type PlanFile<TTask extends PlanTask = PlanTask> = {
  id: string;
  requirementId?: string;
  title: string;
  tasks: TTask[];
};
