export type GateName =
  | "coverage"
  | "typecheck"
  | "security-secrets"
  | "security-sast"
  | "spec"
  | "quality"
  | "plan";

export type GateContext = {
  /** git SHA, plan id, or task id being gated */
  ref: string;
  /** working directory to run the gate in */
  cwd: string;
  /** extra gate-specific options */
  options?: Record<string, string>;
};

export type GateResult = {
  name: GateName;
  ref: string;
  passed: boolean;
  details: GateDetail[];
  durationMs: number;
};

export type GateDetail = {
  severity: "info" | "warn" | "error";
  message: string;
  location?: string;
};
