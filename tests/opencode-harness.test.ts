import { describe, expect, test } from "bun:test";
import { buildOpenCodeHarnessCommand, evaluateOpenCodeTranscript } from "../scripts/opencode-harness";

describe("OpenCode harness", () => {
  test("builds a bounded opencode run command", () => {
    const command = buildOpenCodeHarnessCommand({
      prompt: 'bootstrap and route to plan for "repo"',
    });

    expect(command).toBe(
      'opencode run --print-logs "bootstrap and route to plan for \\\"repo\\\""',
    );
  });

  test("validates bootstrap to plan-ready progression", () => {
    const result = evaluateOpenCodeTranscript(`
[bootstrap] plugin=.opencode/plugins/imitation-machine.js
[bootstrap] service=skill initialized
[skill] using-agentic loaded
[route] selected process skill: plan
[state] plan-ready
`);

    expect(result.valid).toBe(true);
    expect(result.selectedProcessSkill).toBe("plan");
    expect(result.stages).toEqual(["bootstrap", "process-skill", "plan-ready"]);
    expect(result.issues).toEqual([]);
  });

  test("accepts dispatching-parallel-agents as a documented process-skill route", () => {
    const result = evaluateOpenCodeTranscript(`
[bootstrap] plugin=.opencode/plugins/imitation-machine.js
[bootstrap] service=skill initialized
[skill] using-agentic loaded
[route] selected process skill: dispatching-parallel-agents
[state] plan-ready
`);

    expect(result.valid).toBe(true);
    expect(result.selectedProcessSkill).toBe("dispatching-parallel-agents");
  });

  test("parses the selected process skill from the first route line in transcript order", () => {
    const result = evaluateOpenCodeTranscript(`
[bootstrap] plugin=.opencode/plugins/imitation-machine.js
[bootstrap] service=skill initialized
[skill] using-agentic loaded
[route] selected process skill: plan
[route] selected process skill: brainstorm
[state] plan-ready
`);

    expect(result.valid).toBe(true);
    expect(result.selectedProcessSkill).toBe("plan");
  });

  test("rejects transcripts that skip process-skill selection", () => {
    const result = evaluateOpenCodeTranscript(`
[bootstrap] plugin=.opencode/plugins/imitation-machine.js
[skill] using-agentic loaded
[state] plan-ready
`);

    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Missing process-skill selection");
  });

  test("rejects transcripts that only mention loose bootstrap or state substrings", () => {
    const result = evaluateOpenCodeTranscript(`
[note] plugin=.opencode/plugins/imitation-machine.js would load later
[note] service=skill initialized eventually
[note] using-agentic loaded maybe
[route] selected process skill: plan
[summary] plan-ready-ish
`);

    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Missing bootstrap evidence");
    expect(result.issues).toContain("Missing plan-ready state");
  });

  test("rejects transcripts with out-of-order progression", () => {
    const result = evaluateOpenCodeTranscript(`
[state] plan-ready
[bootstrap] plugin=.opencode/plugins/imitation-machine.js
[bootstrap] service=skill initialized
[skill] using-agentic loaded
[route] selected process skill: plan
`);

    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Out-of-order progression: bootstrap -> process-skill -> plan-ready");
  });
});
