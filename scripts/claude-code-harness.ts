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

export function evaluateClaudeTranscript(transcript: string): ClaudeTranscriptResult {
  const issues: string[] = [];
  const stages: ClaudeStage[] = [];
  const lines = getTrimmedLines(transcript);
  const visibleSkills = parseVisibleSkills(transcript);
  const workflowRoute = transcript.match(/\[route\]\s+workflow:\s+([^\n]+)/)?.[1]?.trim() ?? null;
  const installed = transcript.includes("[install] plugin imitation-machine@imitation-machine-dev installed");
  const reviewReady = transcript.includes("[state] review-ready");
  const installIndex = lines.findIndex((line) => line === "[install] plugin imitation-machine@imitation-machine-dev installed");
  const skillsIndex = lines.findIndex((line) => line.startsWith("[skills] visible: "));
  const routingIndex = lines.findIndex((line) => line.startsWith("[route] workflow: "));
  const reviewReadyIndex = lines.findIndex((line) => line === "[state] review-ready");
  const missingVisibleSkills = FAST_HARNESS_VISIBLE_SKILL_SUBSET.filter((skill) =>
    !visibleSkills.includes(skill),
  );
  const routeSupported =
    workflowRoute !== null &&
    (SUPPORTED_WORKFLOW_ROUTES as readonly string[]).includes(workflowRoute);

  if (installed && missingVisibleSkills.length === 0) {
    stages.push("install-visible-skills");
  } else {
    if (!installed) {
      issues.push("Missing install evidence");
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
