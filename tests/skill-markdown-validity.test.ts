import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SKILLS_ROOT = join(process.cwd(), "skills");

function walkMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...walkMarkdownFiles(path));
      continue;
    }
    if (path.endsWith(".md")) {
      files.push(path);
    }
  }

  return files;
}

describe("skill markdown validity", () => {
  test("all skill markdown files have balanced fenced code blocks", () => {
    const badFiles: Array<{ file: string; fences: number }> = [];

    for (const file of walkMarkdownFiles(SKILLS_ROOT)) {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      let fences = 0;
      for (const line of lines) {
        if (line.trim().startsWith("```")) {
          fences += 1;
        }
      }
      if (fences % 2 !== 0) {
        badFiles.push({ file, fences });
      }
    }

    expect(badFiles).toEqual([]);
  });
});
