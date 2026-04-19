export type ClaudeStage = "install-visible-skills" | "workflow-routing" | "review-ready";

export type ClaudeTranscriptResult = {
  valid: boolean;
  stages: ClaudeStage[];
  visibleSkills: string[];
  workflowRoute: string | null;
  issues: string[];
};

const FAST_HARNESS_VISIBLE_SKILL_SUBSET = [
  "using-agentic",
  "requesting-code-review",
  "review-spec",
  "review-quality",
] as const;

const SUPPORTED_WORKFLOW_ROUTES = [
  "requesting-code-review",
  "receiving-code-review",
  "finishing-a-development-branch",
  "pr",
  "release",
] as const;

const INSTALL_MARKERS = ["[install] plugin imitation-machine@imitation-machine-dev installed"] as const;

const AGENT_OUTPUT_STATUSES = ["DONE", "DONE_WITH_CONCERNS", "NEEDS_CONTEXT", "BLOCKED"] as const;

function parseVisibleSkills(transcript: string): string[] {
  const match = transcript.match(/\[skills\]\s+visible:\s+(.+)/);
  if (!match?.[1]) {
    return [];
  }

  return match[1]
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function getTrimmedLines(transcript: string): string[] {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getLineIndex(lines: string[], predicate: (line: string) => boolean): number {
  return lines.findIndex(predicate);
}

function parseWorkflowRoute(lines: string[]): string | null {
  const routeLine = lines.find((line) => line.startsWith("[route] workflow: "));
  return routeLine?.replace("[route] workflow: ", "").trim() || null;
}

function parseLoadedWorkflowSkill(lines: string[]): string | null {
  const loadedLine = lines.find((line) => line.startsWith("[skill] workflow skill loaded: "));
  return loadedLine?.replace("[skill] workflow skill loaded: ", "").trim() || null;
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
    const match = line.match(/^(\[agent:[^\]]+\] status: )(DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED)$/);

    if (match && (AGENT_OUTPUT_STATUSES as readonly string[]).includes(match[2]!)) {
      agentOutputLines.push(line);
    }
  }

  return agentOutputLines;
}

export function evaluateClaudeTranscript(transcript: string): ClaudeTranscriptResult {
  const issues: string[] = [];
  const stages: ClaudeStage[] = [];
  const lines = getTrimmedLines(transcript);
  const visibleSkills = parseVisibleSkills(transcript);
  const workflowRoute = parseWorkflowRoute(lines);
  const loadedWorkflowSkill = parseLoadedWorkflowSkill(lines);
  const installed = INSTALL_MARKERS.every((marker) => lines.includes(marker));
  const reviewReady = lines.includes("[state] review-ready");
  const installIndex = getLineIndex(lines, (line) => line === "[install] plugin imitation-machine@imitation-machine-dev installed");
  const skillsIndex = getLineIndex(lines, (line) => line.startsWith("[skills] visible: "));
  const routingIndex = getLineIndex(lines, (line) => line.startsWith("[route] workflow: "));
  const reviewReadyIndex = lines.findIndex((line) => line === "[state] review-ready");
  const missingVisibleSkills = FAST_HARNESS_VISIBLE_SKILL_SUBSET.filter((skill) =>
    !visibleSkills.includes(skill),
  );
  const missingInstallMarkers = INSTALL_MARKERS.filter((marker) => !lines.includes(marker));
  const staleVerificationEvidence = getStaleVerificationEvidence(lines);
  const agentOutputLines = getAgentOutputLines(lines);
  const uniqueAgentOutputStatuses = [...new Set(agentOutputLines.map((line) => line.split(": ").at(-1)))];
  const routeSupported =
    workflowRoute !== null &&
    (SUPPORTED_WORKFLOW_ROUTES as readonly string[]).includes(workflowRoute);

  if (installed && missingVisibleSkills.length === 0) {
    stages.push("install-visible-skills");
  } else {
    if (!installed) {
      issues.push(`Missing install evidence: ${missingInstallMarkers.join("; ")}`);
    }
    if (missingVisibleSkills.length > 0) {
      issues.push(`Missing expected visible skills: ${missingVisibleSkills.join(", ")}`);
    }
  }

  if (routeSupported) {
    stages.push("workflow-routing");
  } else {
    if (workflowRoute === null) {
      issues.push("Missing workflow routing");
    } else {
      issues.push(`Unsupported workflow route: ${workflowRoute}`);
    }
  }

  if (workflowRoute && loadedWorkflowSkill && workflowRoute !== loadedWorkflowSkill) {
    issues.push(
      `Wrong workflow skill loaded: [route] workflow: ${workflowRoute}; [skill] workflow skill loaded: ${loadedWorkflowSkill}`,
    );
  }

  if (staleVerificationEvidence.length > 0) {
    issues.push(`Stale verification evidence: ${staleVerificationEvidence.join("; ")}`);
  }

  if (uniqueAgentOutputStatuses.length > 1) {
    issues.push(`Contradictory agent outputs: ${agentOutputLines.join("; ")}`);
  }

  if (reviewReady) {
    stages.push("review-ready");
  } else {
    issues.push("Missing review-ready state");
  }

  if (
    installed &&
    missingVisibleSkills.length === 0 &&
    routeSupported &&
    reviewReady &&
    !(installIndex < skillsIndex && skillsIndex < routingIndex && routingIndex < reviewReadyIndex)
  ) {
    issues.push("Out-of-order progression: install-visible-skills -> workflow-routing -> review-ready");
  }

  return {
    valid: issues.length === 0,
    stages,
    visibleSkills,
    workflowRoute,
    issues,
  };
}
