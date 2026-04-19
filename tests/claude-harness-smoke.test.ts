import { describe, expect, test } from "bun:test";
import { evaluateClaudeTranscript } from "../scripts/claude-code-harness";

describe("Claude harness smoke", () => {
  test("fixture shows bounded visible-skill subset to review-ready progression", async () => {
    const transcript = await Bun.file("tests/harness-fixtures/claude-review-session.txt").text();
    const result = evaluateClaudeTranscript(transcript);

    expect(result.valid).toBe(true);
    expect(result.visibleSkills).toEqual([
      "using-agentic",
      "requesting-code-review",
      "review-spec",
      "review-quality",
    ]);
    expect(result.workflowRoute).toBe("requesting-code-review");
    expect(result.stages).toEqual(["install-visible-skills", "workflow-routing", "review-ready"]);
    expect(result.issues).toEqual([]);
  });

  test("fixture reports missing install recovery issue", async () => {
    const transcript = await Bun.file("tests/harness-fixtures/claude-missing-install.txt").text();
    const result = evaluateClaudeTranscript(transcript);

    expect(result.valid).toBe(false);
    expect(result.workflowRoute).toBe("requesting-code-review");
    expect(result.stages).toEqual(["workflow-routing", "review-ready"]);
    expect(result.issues).toContain(
      "Missing install evidence: [install] plugin imitation-machine@imitation-machine-dev installed",
    );
  });

  test("fixture reports wrong workflow skill recovery issue", async () => {
    const transcript = await Bun.file("tests/harness-fixtures/claude-wrong-workflow-skill.txt").text();
    const result = evaluateClaudeTranscript(transcript);

    expect(result.valid).toBe(false);
    expect(result.workflowRoute).toBe("requesting-code-review");
    expect(result.stages).toEqual(["install-visible-skills", "workflow-routing", "review-ready"]);
    expect(result.issues).toContain(
      "Wrong workflow skill loaded: [route] workflow: requesting-code-review; [skill] workflow skill loaded: receiving-code-review",
    );
  });

  test("fixture reports stale verification evidence recovery issue", async () => {
    const transcript = await Bun.file(
      "tests/harness-fixtures/claude-stale-verification-evidence.txt",
    ).text();
    const result = evaluateClaudeTranscript(transcript);

    expect(result.valid).toBe(false);
    expect(result.workflowRoute).toBe("requesting-code-review");
    expect(result.stages).toEqual(["install-visible-skills", "workflow-routing", "review-ready"]);
    expect(result.issues).toContain(
      "Stale verification evidence: [verify] evidence source=previous-run age=2h command=bun test tests/claude-harness.test.ts",
    );
  });

  test("fixture reports contradictory agent outputs recovery issue", async () => {
    const transcript = await Bun.file(
      "tests/harness-fixtures/claude-contradictory-agent-outputs.txt",
    ).text();
    const result = evaluateClaudeTranscript(transcript);

    expect(result.valid).toBe(false);
    expect(result.workflowRoute).toBe("requesting-code-review");
    expect(result.stages).toEqual(["install-visible-skills", "workflow-routing", "review-ready"]);
    expect(result.issues).toContain(
      "Contradictory agent outputs: [agent:coder] status: DONE; [agent:reviewer] status: BLOCKED",
    );
  });
});
