import type { GateContext, GateResult, GateDetail } from "./types";
import type { PlanFile, PlanTask } from "../agents/types";

const PLACEHOLDER_PATTERNS = [
  /\bTBD\b/,
  /\bTODO\b/,
  /\bFIXME\b/,
  /fill in/i,
  /similar to task/i,
  /see task \w/i,
  /handle edge cases/i,
  /\.\.\./,
];

export async function run(ctx: GateContext): Promise<GateResult> {
  const start = Date.now();
  const details: GateDetail[] = [];

  const planPath = ctx.options?.["planPath"];
  if (!planPath) {
    return {
      name: "plan",
      ref: ctx.ref,
      passed: false,
      details: [{ severity: "error", message: "planPath option required (path to plan JSON file)" }],
      durationMs: Date.now() - start,
    };
  }

  let plan: PlanFile;
  try {
    plan = await Bun.file(planPath).json() as PlanFile;
  } catch {
    return {
      name: "plan",
      ref: ctx.ref,
      passed: false,
      details: [{ severity: "error", message: `Could not read plan file: ${planPath}` }],
      durationMs: Date.now() - start,
    };
  }

  for (const task of plan.tasks) {
    const fieldsToCheck = [task.title, task.description, task.verificationCommand, task.expectedOutput];

    for (const field of fieldsToCheck) {
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(field)) {
          details.push({
            severity: "error",
            message: `Placeholder found in task "${task.id}": matches pattern ${pattern}`,
            location: planPath,
          });
        }
      }
    }

    if (task.filePaths.length === 0) {
      details.push({
        severity: "error",
        message: `Task "${task.id}" has no file paths specified`,
        location: planPath,
      });
    }

    if (typeof task.executionGroupId !== "string" || task.executionGroupId.trim().length === 0) {
      details.push({
        severity: "error",
        message: `Task "${task.id}" must specify a non-empty executionGroupId`,
        location: planPath,
      });
    }

    if (typeof task.prGroupId !== "string" || task.prGroupId.trim().length === 0) {
      details.push({
        severity: "error",
        message: `Task "${task.id}" must specify a non-empty prGroupId`,
        location: planPath,
      });
    }

    if (task.independence !== "independent" && task.independence !== "shared") {
      details.push({
        severity: "error",
        message: `Task "${task.id}" must set independence to \"independent\" or \"shared\"`,
        location: planPath,
      });
    }

    if (task.dependsOnTaskIds !== undefined) {
      if (!Array.isArray(task.dependsOnTaskIds) || task.dependsOnTaskIds.some((dep) => typeof dep !== "string" || dep.trim().length === 0)) {
        details.push({
          severity: "error",
          message: `Task "${task.id}" dependsOnTaskIds must be an array of non-empty task ids`,
          location: planPath,
        });
      }
    }

    if (task.estimatedMinutes > 5) {
      details.push({
        severity: "warn",
        message: `Task "${task.id}" estimated at ${task.estimatedMinutes}min — exceeds 5min target`,
        location: planPath,
      });
    }
  }

  const errors = details.filter((d) => d.severity === "error");

  if (errors.length === 0) {
    details.push({ severity: "info", message: `Plan "${plan.title}" verified — ${plan.tasks.length} tasks, no placeholders` });
  }

  return {
    name: "plan",
    ref: ctx.ref,
    passed: errors.length === 0,
    details,
    durationMs: Date.now() - start,
  };
}
