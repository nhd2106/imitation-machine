import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  clearProjectModeOverride,
  getModePolicy,
  getModeOverrideStorePath,
  readModeOverrideStore,
  resolveProjectMode,
  writeProjectModeOverride,
} from "../cli/mode";

describe("project mode resolution", () => {
  test("falls back to standard when no config or override exists", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "agentic-mode-project-"));
    const storePath = join(projectRoot, "mode-store.json");

    await expect(resolveProjectMode({ projectRoot, storePath })).resolves.toMatchObject({
      mode: "standard",
      source: "fallback",
    });
  });

  test("uses repo default mode from .imitation-machine.json", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "agentic-mode-project-"));
    const storePath = join(projectRoot, "mode-store.json");

    await writeFile(join(projectRoot, ".imitation-machine.json"), JSON.stringify({ mode: "lite" }, null, 2));

    await expect(resolveProjectMode({ projectRoot, storePath })).resolves.toMatchObject({
      mode: "lite",
      source: "repo-config",
    });
  });

  test("prefers project override over repo config until cleared", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "agentic-mode-project-"));
    const storePath = join(projectRoot, "mode-store.json");

    await writeFile(join(projectRoot, ".imitation-machine.json"), JSON.stringify({ mode: "lite" }, null, 2));
    await writeProjectModeOverride({ projectRoot, mode: "strict", storePath });

    await expect(resolveProjectMode({ projectRoot, storePath })).resolves.toMatchObject({
      mode: "strict",
      source: "override",
    });

    await clearProjectModeOverride({ projectRoot, storePath });

    await expect(resolveProjectMode({ projectRoot, storePath })).resolves.toMatchObject({
      mode: "lite",
      source: "repo-config",
    });
  });

  test("ignores invalid override and falls back to repo config", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "agentic-mode-project-"));
    const storePath = join(projectRoot, "mode-store.json");

    await writeFile(join(projectRoot, ".imitation-machine.json"), JSON.stringify({ mode: "strict" }, null, 2));
    await mkdir(join(projectRoot, "nested"), { recursive: true });
    await writeFile(storePath, JSON.stringify({ version: 1, overrides: { [projectRoot]: "invalid" } }, null, 2));

    await expect(resolveProjectMode({ projectRoot, storePath })).resolves.toMatchObject({
      mode: "strict",
      source: "repo-config",
      warnings: [
        `Ignoring malformed project mode override \"invalid\" in ${storePath}.`,
      ],
    });
  });

  test("ignores invalid repo config and falls back to standard", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "agentic-mode-project-"));
    const storePath = join(projectRoot, "mode-store.json");

    await writeFile(join(projectRoot, ".imitation-machine.json"), JSON.stringify({ mode: "turbo" }, null, 2));

    await expect(resolveProjectMode({ projectRoot, storePath })).resolves.toMatchObject({
      mode: "standard",
      source: "fallback",
      warnings: [
        `Ignoring malformed repo mode \"turbo\" in ${join(projectRoot, ".imitation-machine.json")}.`,
      ],
    });
  });

  test("warns when repo config JSON is malformed", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "agentic-mode-project-"));
    const storePath = join(projectRoot, "mode-store.json");
    const configPath = join(projectRoot, ".imitation-machine.json");

    await writeFile(configPath, "{ mode: ");

    await expect(resolveProjectMode({ projectRoot, storePath })).resolves.toMatchObject({
      mode: "standard",
      source: "fallback",
      warnings: [`Ignoring malformed JSON in ${configPath}.`],
    });
  });

  test("warns when repo config mode is not a string", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "agentic-mode-project-"));
    const storePath = join(projectRoot, "mode-store.json");
    const configPath = join(projectRoot, ".imitation-machine.json");

    await writeFile(configPath, JSON.stringify({ mode: true }, null, 2));

    await expect(resolveProjectMode({ projectRoot, storePath })).resolves.toMatchObject({
      mode: "standard",
      source: "fallback",
      warnings: [`Ignoring non-string repo mode in ${configPath}.`],
    });
  });

  test("warns when override store JSON is malformed", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "agentic-mode-project-"));
    const storePath = join(projectRoot, "mode-store.json");

    await writeFile(storePath, "{ overrides: ");

    await expect(resolveProjectMode({ projectRoot, storePath })).resolves.toMatchObject({
      mode: "standard",
      source: "fallback",
      warnings: [`Ignoring malformed JSON in ${storePath}.`],
    });
  });

  test("refuses to write an override when the store JSON is malformed", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "agentic-mode-project-"));
    const storePath = join(projectRoot, "mode-store.json");

    await writeFile(storePath, "{ overrides: ");

    await expect(writeProjectModeOverride({ projectRoot, mode: "lite", storePath })).rejects.toThrow(
      `Mode override store is invalid: ${storePath}`,
    );

    expect(await Bun.file(storePath).text()).toBe("{ overrides: ");
  });

  test("refuses to clear an override when the store schema is invalid", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "agentic-mode-project-"));
    const storePath = join(projectRoot, "mode-store.json");

    await writeFile(storePath, JSON.stringify({ version: "1", overrides: {} }, null, 2));

    await expect(clearProjectModeOverride({ projectRoot, storePath })).rejects.toThrow(
      `Mode override store is invalid: ${storePath}`,
    );

    expect(await Bun.file(storePath).json()).toEqual({ version: "1", overrides: {} });
  });

  test("warns when current project override value is not a string", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "agentic-mode-project-"));
    const storePath = join(projectRoot, "mode-store.json");

    await writeFile(storePath, JSON.stringify({ version: 1, overrides: { [projectRoot]: 123 } }, null, 2));

    await expect(resolveProjectMode({ projectRoot, storePath })).resolves.toMatchObject({
      mode: "standard",
      source: "fallback",
      warnings: [`Ignoring non-string project mode override in ${storePath} for ${projectRoot}.`],
    });
  });

  test("stores overrides keyed by normalized project path", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "agentic-mode-project-"));
    const projectRoot = join(tempRoot, "project");
    const storePath = join(tempRoot, "mode-store.json");
    await mkdir(projectRoot, { recursive: true });

    await writeProjectModeOverride({ projectRoot: join(projectRoot, "."), mode: "lite", storePath });

    const store = await readModeOverrideStore(storePath);
    expect(store.overrides[projectRoot]).toBe("lite");
  });

  test("writing an override preserves unrelated malformed store entries", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "agentic-mode-project-"));
    const projectRoot = join(tempRoot, "project-a");
    const otherProject = join(tempRoot, "project-b");
    const storePath = join(tempRoot, "mode-store.json");
    await mkdir(projectRoot, { recursive: true });

    await writeFile(
      storePath,
      JSON.stringify({ version: 1, overrides: { [otherProject]: false } }, null, 2),
    );

    await writeProjectModeOverride({ projectRoot, mode: "strict", storePath });

    expect(await Bun.file(storePath).json()).toEqual({
      version: 1,
      overrides: {
        [otherProject]: false,
        [projectRoot]: "strict",
      },
    });
  });

  test("clearing an override preserves unrelated malformed store entries", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "agentic-mode-project-"));
    const projectRoot = join(tempRoot, "project-a");
    const otherProject = join(tempRoot, "project-b");
    const storePath = join(tempRoot, "mode-store.json");
    await mkdir(projectRoot, { recursive: true });

    await writeFile(
      storePath,
      JSON.stringify({ version: 1, overrides: { [projectRoot]: "lite", [otherProject]: { mode: "broken" } } }, null, 2),
    );

    await clearProjectModeOverride({ projectRoot, storePath });

    expect(await Bun.file(storePath).json()).toEqual({
      version: 1,
      overrides: {
        [otherProject]: { mode: "broken" },
      },
    });
  });

  test("default override store path resolves outside the repo when env override is unset", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "agentic-mode-project-"));
    const originalStorePath = process.env.AGENTIC_MODE_STORE_PATH;
    delete process.env.AGENTIC_MODE_STORE_PATH;

    try {
      const storePath = getModeOverrideStorePath();
      expect(storePath).toContain(join(".config", "imitation-machine", "project-mode-overrides.json"));
      expect(storePath.startsWith(projectRoot)).toBeFalse();
    } finally {
      if (typeof originalStorePath === "string") {
        process.env.AGENTIC_MODE_STORE_PATH = originalStorePath;
      }
    }
  });

  test("lite policy summary matches current enforcement", () => {
    expect(getModePolicy("lite").summary).toBe(
      "Lite relaxes the pre-workflow guard after bootstrap: bash and file writes are allowed without an implementation workflow skill.",
    );
  });
});
