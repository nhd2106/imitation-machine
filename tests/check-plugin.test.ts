import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validatePluginSetup } from "../cli/commands/check-plugin";

describe("check-plugin command", () => {
  test("passes when required plugin files and manifest paths exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "agentic-check-plugin-pass-"));
    await mkdir(join(root, ".opencode/plugins"), { recursive: true });
    await mkdir(join(root, ".claude-plugin"), { recursive: true });
    await mkdir(join(root, "skills/using-agentic"), { recursive: true });
    await mkdir(join(root, "bin"), { recursive: true });
    await mkdir(join(root, ".opencode"), { recursive: true });

    await Bun.write(join(root, ".opencode/plugins/imitation-machine.js"), "export const x = 1;\n");
    await Bun.write(join(root, "bin/agentic"), "#!/usr/bin/env bash\n");
    await Bun.write(join(root, "skills/using-agentic/SKILL.md"), "# using-agentic\n");
    await Bun.write(
      join(root, ".claude-plugin/plugin.json"),
      JSON.stringify({
        name: "imitation-machine",
        version: "0.1.0",
        author: { name: "duoc95" },
      }),
    );
    await Bun.write(
      join(root, "package.json"),
      JSON.stringify({
        main: ".opencode/plugins/imitation-machine.js",
        bin: { agentic: "./bin/agentic" },
        files: [".opencode/**", ".claude-plugin/**", "skills/**"],
      }),
    );
    await Bun.write(
      join(root, ".opencode/opencode.json"),
      JSON.stringify({ plugin: ["file:///tmp/imitation-machine.js"] }),
    );

    const report = await validatePluginSetup(root);
    expect(report.passed).toBe(true);
    expect(report.checks.some((check) => check.severity === "fail")).toBe(false);
    expect(
      report.checks.some(
        (check) => check.id === "package:bin:agentic" && check.severity === "pass",
      ),
    ).toBe(true);
  });

  test("fails when no discoverable skills exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "agentic-check-plugin-fail-"));
    await mkdir(join(root, ".opencode/plugins"), { recursive: true });
    await mkdir(join(root, ".claude-plugin"), { recursive: true });
    await mkdir(join(root, "bin"), { recursive: true });

    await Bun.write(join(root, ".opencode/plugins/imitation-machine.js"), "export const x = 1;\n");
    await Bun.write(join(root, "bin/agentic"), "#!/usr/bin/env bash\n");
    await Bun.write(
      join(root, ".claude-plugin/plugin.json"),
      JSON.stringify({
        name: "imitation-machine",
        version: "0.1.0",
        author: { name: "duoc95" },
      }),
    );
    await Bun.write(
      join(root, "package.json"),
      JSON.stringify({
        main: ".opencode/plugins/imitation-machine.js",
        bin: { agentic: "./cli/index.ts" },
        files: [".opencode/**", ".claude-plugin/**", "skills/**"],
      }),
    );

    const report = await validatePluginSetup(root);
    expect(report.passed).toBe(false);
    expect(
      report.checks.some(
        (check) => check.id === "claude:skills-present" && check.severity === "fail",
      ),
    ).toBe(true);
  });
});
