import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const FIXTURE_DIR = "tests/taxonomy-disambiguation";

const EXPECTED_FIXTURES = [
  "zoom-out-vs-architecture-deepening.md",
  "verify-vs-gate.md",
  "review-final-vs-review-quality.md",
  "prototype-vs-zoom-out.md",
  "requirements-brief-vs-grill-me.md",
  "issue-slicing-vs-plan.md",
] as const;

async function readFixture(filename: string): Promise<string> {
  return Bun.file(join(ROOT, FIXTURE_DIR, filename)).text();
}

describe("taxonomy disambiguation fixtures", () => {
  test("all expected disambiguation fixtures exist", async () => {
    const entries = await readdir(join(ROOT, FIXTURE_DIR));
    for (const fixture of EXPECTED_FIXTURES) {
      expect(entries, `${fixture} should exist`).toContain(fixture);
    }
  });

  test("each fixture compares exactly one confusable pair in its title", async () => {
    for (const fixture of EXPECTED_FIXTURES) {
      const content = await readFixture(fixture);
      const firstLine = content.split("\n")[0] ?? "";

      expect(firstLine, `${fixture} should start with a # title`).toMatch(/^# /);
      expect(firstLine, `${fixture} title should compare two skills with vs.`).toMatch(/vs\./i);
    }
  });

  test("each fixture has at least three ambiguous prompts and explicit routing decisions", async () => {
    for (const fixture of EXPECTED_FIXTURES) {
      const content = await readFixture(fixture);
      const ambiguousPromptHeadings = (content.match(/^## Ambiguous Prompt \d+/gm) ?? []).length;
      const shouldPickCount = (content.match(/Should pick: `[a-z-]+`/g) ?? []).length;
      const shouldNotPickCount = (content.match(/Should NOT pick:/g) ?? []).length;

      expect(ambiguousPromptHeadings, `${fixture} should have at least 3 ambiguous prompts`).toBeGreaterThanOrEqual(3);
      expect(shouldPickCount, `${fixture} should have at least 3 'Should pick' decisions`).toBeGreaterThanOrEqual(3);
      expect(shouldNotPickCount, `${fixture} should have at least 3 'Should NOT pick' decisions`).toBeGreaterThanOrEqual(3);
    }
  });

  test("each fixture includes a Why explanation for each routing decision", async () => {
    for (const fixture of EXPECTED_FIXTURES) {
      const content = await readFixture(fixture);
      const whyCount = (content.match(/^Why:/gm) ?? []).length;

      expect(whyCount, `${fixture} should have a Why: line for each routing decision`).toBeGreaterThanOrEqual(3);
    }
  });

  test("each fixture includes at least one counter-example or non-trigger section", async () => {
    for (const fixture of EXPECTED_FIXTURES) {
      const content = await readFixture(fixture);

      expect(
        /(counter-example|non-trigger)/i.test(content),
        `${fixture} should include a counter-example or non-trigger section`,
      ).toBe(true);
    }
  });

  test("each fixture references only existing IM skills", async () => {
    const KNOWN_SKILLS = new Set(await readdir(join(ROOT, "skills")));

    for (const fixture of EXPECTED_FIXTURES) {
      const content = await readFixture(fixture);
      const skillRefs = [...content.matchAll(/`([a-z][a-z-]+)`/g)]
        .map((match) => match[1])
        .filter((name): name is string => Boolean(name))
        .filter((name) => /^[a-z]+(-[a-z]+)+$/.test(name) && !name.startsWith("agentic"));

      for (const skill of new Set(skillRefs)) {
        if (skill === "agentic-verify-all" || skill === "agentic-plan-approve") continue;
        if (skill === "tsk-410" || skill === "pln-903") continue;
        if (skill === "your-human-partner") continue;

        const matchesSkill = KNOWN_SKILLS.has(skill);
        const matchesAgent = skill.startsWith("@") || skill.includes("reviewer-") || skill === "po" || skill === "qa";
        const matchesCommand = ["gate", "verify", "plan", "worktree", "repo", "audit", "mode", "orchestrate", "install"].includes(skill);
        const matchesPersona = ["reviewer-final", "reviewer-spec", "reviewer-quality"].includes(skill);

        expect(
          matchesSkill || matchesAgent || matchesCommand || matchesPersona,
          `${fixture} references \`${skill}\` which is not a known IM skill, agent, or command`,
        ).toBe(true);
      }
    }
  });
});
