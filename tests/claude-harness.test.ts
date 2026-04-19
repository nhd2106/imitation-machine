import { describe, expect, test } from "bun:test";
import { evaluateClaudeTranscript } from "../scripts/claude-code-harness";

describe("Claude harness", () => {
  test("parses a bounded visible-skill subset and review-ready flow", () => {
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

  test("rejects installs that do not expose the bounded visible-skill subset", () => {
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

  test("reports exactly which install/bootstrap lines are missing", () => {
    const result = evaluateClaudeTranscript(`
[skills] visible: using-agentic, requesting-code-review, review-spec, review-quality
[route] workflow: requesting-code-review
[state] review-ready
`);

    expect(result.valid).toBe(false);
    expect(result.stages).toEqual(["workflow-routing", "review-ready"]);
    expect(result.issues).toContain(
      "Missing install evidence: [install] plugin imitation-machine@imitation-machine-dev installed",
    );
  });

  test("rejects transcripts that load a workflow skill contradicting the selected route", () => {
    const result = evaluateClaudeTranscript(`
[install] plugin imitation-machine@imitation-machine-dev installed
[skills] visible: using-agentic, requesting-code-review, review-spec, review-quality
[route] workflow: requesting-code-review
[skill] workflow skill loaded: receiving-code-review
[state] review-ready
`);

    expect(result.valid).toBe(false);
    expect(result.workflowRoute).toBe("requesting-code-review");
    expect(result.stages).toEqual(["install-visible-skills", "workflow-routing", "review-ready"]);
    expect(result.issues).toContain(
      "Wrong workflow skill loaded: [route] workflow: requesting-code-review; [skill] workflow skill loaded: receiving-code-review",
    );
  });

  test("rejects transcripts with stale verification evidence", () => {
    const result = evaluateClaudeTranscript(`
[install] plugin imitation-machine@imitation-machine-dev installed
[skills] visible: using-agentic, requesting-code-review, review-spec, review-quality
[route] workflow: requesting-code-review
[verify] evidence source=previous-run age=2h command=bun test tests/claude-harness.test.ts
[state] review-ready
`);

    expect(result.valid).toBe(false);
    expect(result.workflowRoute).toBe("requesting-code-review");
    expect(result.stages).toEqual(["install-visible-skills", "workflow-routing", "review-ready"]);
    expect(result.issues).toContain(
      "Stale verification evidence: [verify] evidence source=previous-run age=2h command=bun test tests/claude-harness.test.ts",
    );
  });

  test("rejects transcripts with contradictory agent outputs", () => {
    const result = evaluateClaudeTranscript(`
[install] plugin imitation-machine@imitation-machine-dev installed
[skills] visible: using-agentic, requesting-code-review, review-spec, review-quality
[route] workflow: requesting-code-review
[agent:coder] status: DONE
[agent:reviewer] status: BLOCKED
[state] review-ready
`);

    expect(result.valid).toBe(false);
    expect(result.workflowRoute).toBe("requesting-code-review");
    expect(result.stages).toEqual(["install-visible-skills", "workflow-routing", "review-ready"]);
    expect(result.issues).toContain(
      "Contradictory agent outputs: [agent:coder] status: DONE; [agent:reviewer] status: BLOCKED",
    );
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
