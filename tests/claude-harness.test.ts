import { describe, expect, test } from "bun:test";
import { evaluateClaudeTranscript } from "../scripts/claude-code-harness";

describe("Claude harness", () => {
  test("parses a bounded install and verification flow", () => {
    const result = evaluateClaudeTranscript(`
[install] plugin imitation-machine@imitation-machine-dev installed
[skills] visible: using-agentic, requesting-code-review, review-spec, review-quality
[route] workflow: requesting-code-review
[state] review-ready
`);

    expect(result.valid).toBe(true);
    expect(result.visibleSkills).toEqual([
      "using-agentic",
      "requesting-code-review",
      "review-spec",
      "review-quality",
    ]);
    expect(result.workflowRoute).toBe("requesting-code-review");
    expect(result.stages).toEqual(["install-visible-skills", "workflow-routing", "review-ready"]);
  });

  test("flags missing review-ready progression", () => {
    const result = evaluateClaudeTranscript(`
[install] plugin imitation-machine@imitation-machine-dev installed
[skills] visible: using-agentic, requesting-code-review, review-spec, review-quality
[route] workflow: requesting-code-review
`);

    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Missing review-ready state");
  });

  test("rejects installs that do not expose the expected workflow skills", () => {
    const result = evaluateClaudeTranscript(`
[install] plugin imitation-machine@imitation-machine-dev installed
[skills] visible: using-agentic, plan, review-spec, review-quality
[route] workflow: requesting-code-review
[state] review-ready
`);

    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Missing expected visible skills: requesting-code-review");
  });

  test("rejects unsupported workflow routes", () => {
    const result = evaluateClaudeTranscript(`
[install] plugin imitation-machine@imitation-machine-dev installed
[skills] visible: using-agentic, requesting-code-review, review-spec, review-quality
[route] workflow: made-up-review-flow
[state] review-ready
`);

    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Unsupported workflow route: made-up-review-flow");
  });

  test("rejects transcripts with out-of-order progression", () => {
    const result = evaluateClaudeTranscript(`
[state] review-ready
[install] plugin imitation-machine@imitation-machine-dev installed
[skills] visible: using-agentic, requesting-code-review, review-spec, review-quality
[route] workflow: requesting-code-review
`);

    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Out-of-order progression: install-visible-skills -> workflow-routing -> review-ready");
  });
});
