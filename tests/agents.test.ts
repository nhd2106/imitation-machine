import { test, expect, describe } from "bun:test";
import { PERSONAS, getPersona } from "../agents/profiles";
import type { PersonaId } from "../agents/types";

describe("agent personas", () => {
  test("exactly 11 canonical personas defined", () => {
    expect(PERSONAS.length).toBe(11);
  });

  test("all persona IDs are unique", () => {
    const ids = PERSONAS.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(11);
  });

  test("all personas have non-empty prompts", () => {
    for (const persona of PERSONAS) {
      expect(persona.promptPrefix.length).toBeGreaterThan(20);
    }
  });

  test("all personas have at least one tool in allowlist", () => {
    for (const persona of PERSONAS) {
      expect(persona.allowlist.length).toBeGreaterThan(0);
    }
  });

  test("getPersona returns correct persona by ID", () => {
    const expected: PersonaId[] = [
      "architect",
      "po",
      "planner",
      "coder",
      "reviewer-spec",
      "reviewer-quality",
      "qa",
      "security",
      "reviewer-final",
      "docs",
      "release",
    ];
    for (const id of expected) {
      const p = getPersona(id);
      expect(p.id).toBe(id);
    }
  });

  test("getPersona throws for unknown ID", () => {
    expect(() => getPersona("unknown" as PersonaId)).toThrow();
  });

  test("coder depends on planner", () => {
    const coder = getPersona("coder");
    expect(coder.dependsOn).toContain("planner");
  });

  test("qa depends on coder", () => {
    const qa = getPersona("qa");
    expect(qa.dependsOn).toContain("coder");
  });

  test("qa persona is read-only advisory and does not promise to write tests", () => {
    const qa = getPersona("qa");
    const prompt = qa.promptPrefix.toLowerCase();

    expect(qa.allowlist).not.toContain("write");
    expect(prompt).toContain("read-only");
    expect(prompt).toContain("advisory");
    expect(prompt).not.toContain("write tests");
    expect(prompt).not.toContain("failing test stubs");
  });

  test("reviewer-final persona is final holistic readiness rather than task-level gate reviewer", () => {
    const reviewer = getPersona("reviewer-final");
    const prompt = reviewer.promptPrefix.toLowerCase();

    expect(reviewer.name.toLowerCase()).toContain("final");
    expect(prompt).toContain("final holistic");
    expect(prompt).toContain("production-readiness");
    expect(prompt).toContain("after task-level");
    expect(prompt).toContain("@reviewer-final");
    expect(prompt).not.toContain("gate 1");
    expect(prompt).not.toContain("gate 2");
  });

  test("legacy reviewer persona resolves as final reviewer compatibility alias", () => {
    const reviewer = getPersona("reviewer");
    const prompt = reviewer.promptPrefix.toLowerCase();

    expect(reviewer.id).toBe("reviewer");
    expect(reviewer.name.toLowerCase()).toContain("final");
    expect(prompt).toContain("legacy persona id `reviewer` maps here");
    expect(prompt).toContain("do not replace separate reviewer-spec or reviewer-quality");
  });

  test("task-level reviewers are separate ordered gates before final review", () => {
    const spec = getPersona("reviewer-spec");
    const quality = getPersona("reviewer-quality");

    expect(spec.dependsOn).toContain("coder");
    expect(quality.dependsOn).toContain("reviewer-spec");
    expect(spec.promptPrefix.toLowerCase()).toContain("spec compliance");
    expect(quality.promptPrefix.toLowerCase()).toContain("quality review");
    expect(spec.promptPrefix.toLowerCase()).not.toContain("final holistic");
    expect(quality.promptPrefix.toLowerCase()).not.toContain("final holistic");
  });

  test("docs persona runs before final reviewer instead of depending on it", () => {
    const docs = getPersona("docs");

    expect(docs.dependsOn).toContain("coder");
    expect(docs.dependsOn).not.toContain("reviewer");
  });

  test("final reviewer depends on specialized evidence personas before release", () => {
    const reviewer = getPersona("reviewer-final");

    expect(reviewer.dependsOn).toContain("reviewer-quality");
    expect(reviewer.dependsOn).toContain("qa");
    expect(reviewer.dependsOn).toContain("security");
    expect(reviewer.dependsOn).toContain("docs");
  });

  test("release depends on final reviewer", () => {
    const release = getPersona("release");
    expect(release.dependsOn).toContain("reviewer-final");
  });

  test("reviewer is read-only (no write in allowlist)", () => {
    expect(getPersona("reviewer-spec").allowlist).not.toContain("write");
    expect(getPersona("reviewer-quality").allowlist).not.toContain("write");
    expect(getPersona("reviewer-final").allowlist).not.toContain("write");
  });

  test("security reviewer has no write in allowlist", () => {
    const security = getPersona("security");
    expect(security.allowlist).not.toContain("write");
  });

  test("architect uses opus model tier for deep reasoning", () => {
    const architect = getPersona("architect");
    expect(architect.modelTier).toBe("opus");
  });

  test("lightweight reviewers use haiku model tier", () => {
    expect(getPersona("qa").modelTier).toBe("haiku");
    expect(getPersona("reviewer-spec").modelTier).toBe("haiku");
    expect(getPersona("reviewer-quality").modelTier).toBe("haiku");
    expect(getPersona("reviewer-final").modelTier).toBe("haiku");
    expect(getPersona("security").modelTier).toBe("haiku");
    expect(getPersona("docs").modelTier).toBe("haiku");
  });
});
