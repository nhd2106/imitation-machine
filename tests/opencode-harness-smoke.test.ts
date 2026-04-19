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

  test("fixture rejects bootstrap to plan-ready progression without a process skill", async () => {
    const transcript = await Bun.file(
      "tests/harness-fixtures/opencode-missing-process-skill.log",
    ).text();
    const result = evaluateOpenCodeTranscript(transcript);

    expect(result.valid).toBe(false);
    expect(result.selectedProcessSkill).toBeNull();
    expect(result.stages).toEqual(["bootstrap"]);
    expect(result.issues).toContain("Missing process-skill selection");
  });

  test("fixture reports missing bootstrap recovery issue", async () => {
    const transcript = await Bun.file("tests/harness-fixtures/opencode-missing-bootstrap.log").text();
    const result = evaluateOpenCodeTranscript(transcript);

    expect(result.valid).toBe(false);
    expect(result.selectedProcessSkill).toBe("plan");
    expect(result.stages).toEqual(["process-skill", "plan-ready"]);
    expect(result.issues).toContain(
      "Missing bootstrap evidence: [bootstrap] plugin=.opencode/plugins/imitation-machine.js; [bootstrap] service=skill initialized; [skill] using-agentic loaded",
    );
  });

  test("fixture reports wrong process skill recovery issue", async () => {
    const transcript = await Bun.file(
      "tests/harness-fixtures/opencode-wrong-process-skill.log",
    ).text();
    const result = evaluateOpenCodeTranscript(transcript);

    expect(result.valid).toBe(false);
    expect(result.selectedProcessSkill).toBe("plan");
    expect(result.stages).toEqual(["bootstrap", "process-skill", "plan-ready"]);
    expect(result.issues).toContain("Wrong process skill loaded: expected plan, loaded brainstorm");
  });

  test("fixture reports stale verification evidence recovery issue", async () => {
    const transcript = await Bun.file(
      "tests/harness-fixtures/opencode-stale-verification-evidence.log",
    ).text();
    const result = evaluateOpenCodeTranscript(transcript);

    expect(result.valid).toBe(false);
    expect(result.selectedProcessSkill).toBe("plan");
    expect(result.stages).toEqual(["bootstrap", "process-skill", "plan-ready"]);
    expect(result.issues).toContain(
      "Stale verification evidence: [verify] evidence source=previous-run age=2h command=bun test",
    );
  });

  test("fixture reports contradictory agent outputs recovery issue", async () => {
    const transcript = await Bun.file(
      "tests/harness-fixtures/opencode-contradictory-agent-outputs.log",
    ).text();
    const result = evaluateOpenCodeTranscript(transcript);

    expect(result.valid).toBe(false);
    expect(result.selectedProcessSkill).toBe("plan");
    expect(result.stages).toEqual(["bootstrap", "process-skill", "plan-ready"]);
    expect(result.issues).toContain(
      "Contradictory agent outputs: [agent:coder] status: DONE; [agent:reviewer] status: BLOCKED",
    );
  });
});
