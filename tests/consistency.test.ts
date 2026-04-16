import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveDbPath } from "../db/client";
import { writePlanTemplate } from "../cli/commands/plan";

describe("runtime path consistency", () => {
  test("defaults AGENTIC_DB_PATH to .agentic/state.db", () => {
    expect(resolveDbPath({})).toBe(".agentic/state.db");
  });
});

describe("plan scaffolding", () => {
  test("writes a plan file scaffold for new plans", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agentic-plan-test-"));
    await mkdir(join(cwd, "plans"), { recursive: true });

    const planPath = await writePlanTemplate(cwd, "PLN-12345678", "REQ-12345678", "Test plan");
    const contents = JSON.parse(await readFile(planPath, "utf8")) as {
      id: string;
      requirementId: string;
      title: string;
      tasks: unknown[];
    };

    expect(planPath).toBe(join(cwd, "plans", "PLN-12345678.json"));
    expect(contents).toEqual({
      id: "PLN-12345678",
      requirementId: "REQ-12345678",
      title: "Test plan",
      tasks: [],
    });
  });
});
