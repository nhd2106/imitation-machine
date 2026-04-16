import { test, expect, describe } from "bun:test";
import { PERSONAS, getPersona } from "../agents/profiles";
import type { PersonaId } from "../agents/types";

describe("agent personas", () => {
  test("exactly 9 personas defined", () => {
    expect(PERSONAS.length).toBe(9);
  });

  test("all persona IDs are unique", () => {
    const ids = PERSONAS.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(9);
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
    const expected: PersonaId[] = ["architect", "po", "planner", "coder", "qa", "security", "reviewer", "docs", "release"];
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

  test("release depends on reviewer, qa, and security", () => {
    const release = getPersona("release");
    expect(release.dependsOn).toContain("reviewer");
    expect(release.dependsOn).toContain("qa");
    expect(release.dependsOn).toContain("security");
  });

  test("reviewer is read-only (no write in allowlist)", () => {
    const reviewer = getPersona("reviewer");
    expect(reviewer.allowlist).not.toContain("write");
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
    expect(getPersona("reviewer").modelTier).toBe("haiku");
    expect(getPersona("security").modelTier).toBe("haiku");
    expect(getPersona("docs").modelTier).toBe("haiku");
  });
});
