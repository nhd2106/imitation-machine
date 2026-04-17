import { describe, expect, test } from "bun:test";
import { evaluateClaudeTranscript } from "../scripts/claude-code-harness";

describe("Claude harness smoke", () => {
  test("fixture shows install visibility to review-ready progression", async () => {
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
});
