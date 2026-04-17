import { describe, expect, test } from "bun:test";
import { evaluateOpenCodeTranscript } from "../scripts/opencode-harness";

describe("OpenCode harness smoke", () => {
  test("fixture shows bootstrap to plan-ready progression", async () => {
    const transcript = await Bun.file("tests/harness-fixtures/opencode-plan-session.log").text();
    const result = evaluateOpenCodeTranscript(transcript);

    expect(result.valid).toBe(true);
    expect(result.selectedProcessSkill).toBe("plan");
    expect(result.stages).toEqual(["bootstrap", "process-skill", "plan-ready"]);
    expect(result.issues).toEqual([]);
  });
});
