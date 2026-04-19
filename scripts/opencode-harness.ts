const PROCESS_SKILLS = [
  "brainstorm",
  "plan",
  "tdd",
  "executing-plans",
  "systematic-debugging",
  "dispatching-parallel-agents",
] as const;

const AGENT_OUTPUT_STATUSES = ["DONE", "DONE_WITH_CONCERNS", "NEEDS_CONTEXT", "BLOCKED"] as const;

export type OpenCodeStage = "bootstrap" | "process-skill" | "plan-ready";

export type OpenCodeTranscriptResult = {
  valid: boolean;
  stages: OpenCodeStage[];
  selectedProcessSkill: (typeof PROCESS_SKILLS)[number] | null;
  issues: string[];
};

const BOOTSTRAP_MARKERS = [
  "[bootstrap] plugin=.opencode/plugins/imitation-machine.js",
  "[bootstrap] service=skill initialized",
  "[skill] using-agentic loaded",
] as const;

function getTrimmedLines(transcript: string): string[] {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getLineIndex(lines: string[], predicate: (line: string) => boolean): number {
  return lines.findIndex(predicate);
}

function parseSelectedProcessSkill(lines: string[]): (typeof PROCESS_SKILLS)[number] | null {
  const routeLine = lines.find((line) => line.startsWith("[route] selected process skill: "));
  const selectedProcessSkill = routeLine
    ?.replace("[route] selected process skill: ", "")
    .trim();

  if (!selectedProcessSkill) {
    return null;
  }

  return (PROCESS_SKILLS as readonly string[]).includes(selectedProcessSkill)
    ? (selectedProcessSkill as (typeof PROCESS_SKILLS)[number])
    : null;
}

function parseLoadedProcessSkill(lines: string[]): (typeof PROCESS_SKILLS)[number] | null {
  const loadLine = lines.find((line) => line.startsWith("[skill] process skill loaded: "));
  const loadedProcessSkill = loadLine?.replace("[skill] process skill loaded: ", "").trim();

  if (!loadedProcessSkill) {
    return null;
  }

  return (PROCESS_SKILLS as readonly string[]).includes(loadedProcessSkill)
    ? (loadedProcessSkill as (typeof PROCESS_SKILLS)[number])
    : null;
}

function hasStaleVerificationEvidence(lines: string[]): boolean {
  return getStaleVerificationEvidence(lines).length > 0;
}

function getStaleVerificationEvidence(lines: string[]): string[] {
  return lines.filter(
    (line) =>
      line.startsWith("[verify] evidence ") &&
      /\b(previous-run|stale)\b/.test(line),
  );
}

function getAgentOutputLines(lines: string[]): string[] {
  const agentOutputLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^\[agent:[^\]]+\] status: (DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED)$/);

    if (match && (AGENT_OUTPUT_STATUSES as readonly string[]).includes(match[1]!)) {
      agentOutputLines.push(line);
    }
  }

  return agentOutputLines;
}

export function buildOpenCodeHarnessCommand({ prompt }: { prompt: string }): string {
  const escapedPrompt = prompt.replaceAll(/\\/g, "\\\\").replaceAll(/"/g, '\\"');
  return `opencode run --print-logs "${escapedPrompt}"`;
}

export function evaluateOpenCodeTranscript(transcript: string): OpenCodeTranscriptResult {
  const issues: string[] = [];
  const stages: OpenCodeStage[] = [];
  const lines = getTrimmedLines(transcript);
  const bootstrapIndexes = BOOTSTRAP_MARKERS.map((marker) => lines.indexOf(marker));
  const bootstrapIndex = Math.max(...bootstrapIndexes);
  const processSkillIndex = getLineIndex(lines, (line) => line.startsWith("[route] selected process skill: "));
  const planReadyIndex = lines.indexOf("[state] plan-ready");

  const hasBootstrap = BOOTSTRAP_MARKERS.every((marker) => lines.includes(marker));
  const missingBootstrapMarkers = BOOTSTRAP_MARKERS.filter((marker) => !lines.includes(marker));

  const selectedProcessSkill = parseSelectedProcessSkill(lines);
  const loadedProcessSkill = parseLoadedProcessSkill(lines);

  const hasPlanReady = lines.includes("[state] plan-ready");
  const staleVerificationEvidence = getStaleVerificationEvidence(lines);
  const agentOutputLines = getAgentOutputLines(lines);
  const uniqueAgentOutputStatuses = [...new Set(agentOutputLines.map((line) => line.split(": ").at(-1)))];

  if (hasBootstrap) {
    stages.push("bootstrap");
  } else {
    issues.push(`Missing bootstrap evidence: ${missingBootstrapMarkers.join("; ")}`);
  }

  if (selectedProcessSkill) {
    stages.push("process-skill");
  } else {
    issues.push("Missing process-skill selection");
  }

  if (hasPlanReady && selectedProcessSkill) {
    stages.push("plan-ready");
  } else if (!hasPlanReady) {
    issues.push("Missing plan-ready state");
  }

  if (selectedProcessSkill && loadedProcessSkill && selectedProcessSkill !== loadedProcessSkill) {
    issues.push(
      `Wrong process skill loaded: expected ${selectedProcessSkill}, loaded ${loadedProcessSkill}`,
    );
  }

  if (hasStaleVerificationEvidence(lines)) {
    issues.push(`Stale verification evidence: ${staleVerificationEvidence.join("; ")}`);
  }

  if (uniqueAgentOutputStatuses.length > 1) {
    issues.push(`Contradictory agent outputs: ${agentOutputLines.join("; ")}`);
  }

  if (
    hasBootstrap &&
    selectedProcessSkill &&
    hasPlanReady &&
    !(bootstrapIndex < processSkillIndex && processSkillIndex < planReadyIndex)
  ) {
    issues.push("Out-of-order progression: bootstrap -> process-skill -> plan-ready");
  }

  return {
    valid: issues.length === 0,
    stages,
    selectedProcessSkill,
    issues,
  };
}
