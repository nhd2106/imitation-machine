import { describe, expect, test } from "bun:test";

describe("Claude plugin metadata", () => {
  test("package and Claude plugin versions stay aligned", async () => {
    const packageJson = JSON.parse(await Bun.file("package.json").text()) as { version: string };
    const pluginJson = JSON.parse(await Bun.file(".claude-plugin/plugin.json").text()) as { version: string };
    const marketplaceJson = JSON.parse(await Bun.file(".claude-plugin/marketplace.json").text()) as {
      plugins: Array<{ version: string }>;
    };

    expect(pluginJson.version).toBe(packageJson.version);
    expect(marketplaceJson.plugins[0]?.version).toBe(packageJson.version);
  });
});
