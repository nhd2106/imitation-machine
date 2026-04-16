import { test, expect, describe } from "bun:test";
import { extractCoveragePct } from "../gates/coverage";
import { run as runPlan } from "../gates/plan";
import { run as runSecretsGate } from "../gates/security-secrets";
import { run as runSastGate } from "../gates/security-sast";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "agentic-test-"));
}

// ── Plan Gate ─────────────────────────────────────────────────────────────────

describe("plan gate", () => {
  test("passes a valid plan with no placeholders", async () => {
    const dir = await makeTempDir();
    const plan = {
      id: "PLN-test",
      title: "Test plan",
      tasks: [
        {
          id: "TSK-001",
          title: "Write failing test",
          description: "Create test that asserts coverage returns false below threshold",
          filePaths: ["tests/gates.test.ts"],
          verificationCommand: "bun test tests/gates.test.ts",
          expectedOutput: "1 pass",
          estimatedMinutes: 3,
          status: "pending",
        },
      ],
    };
    const planPath = join(dir, "PLN-test.json");
    await writeFile(planPath, JSON.stringify(plan));

    const result = await runPlan({ ref: "PLN-test", cwd: dir, options: { planPath } });
    expect(result.passed).toBe(true);
    expect(result.name).toBe("plan");
  });

  test("fails when task contains TBD placeholder", async () => {
    const dir = await makeTempDir();
    const plan = {
      id: "PLN-bad",
      title: "Bad plan",
      tasks: [
        {
          id: "TSK-001",
          title: "TBD",
          description: "Handle edge cases",
          filePaths: ["some/file.ts"],
          verificationCommand: "bun test",
          expectedOutput: "1 pass",
          estimatedMinutes: 3,
          status: "pending",
        },
      ],
    };
    const planPath = join(dir, "PLN-bad.json");
    await writeFile(planPath, JSON.stringify(plan));

    const result = await runPlan({ ref: "PLN-bad", cwd: dir, options: { planPath } });
    expect(result.passed).toBe(false);
    expect(result.details.some((d) => d.severity === "error")).toBe(true);
  });

  test("warns when task exceeds 5 minutes", async () => {
    const dir = await makeTempDir();
    const plan = {
      id: "PLN-slow",
      title: "Slow plan",
      tasks: [
        {
          id: "TSK-001",
          title: "Long task",
          description: "Implement everything",
          filePaths: ["some/file.ts"],
          verificationCommand: "bun test",
          expectedOutput: "pass",
          estimatedMinutes: 10,
          status: "pending",
        },
      ],
    };
    const planPath = join(dir, "PLN-slow.json");
    await writeFile(planPath, JSON.stringify(plan));

    const result = await runPlan({ ref: "PLN-slow", cwd: dir, options: { planPath } });
    expect(result.details.some((d) => d.severity === "warn" && d.message.includes("10min"))).toBe(true);
  });

  test("fails when no planPath option provided", async () => {
    const dir = await makeTempDir();
    const result = await runPlan({ ref: "PLN-x", cwd: dir });
    expect(result.passed).toBe(false);
  });

  test("fails when task has empty filePaths", async () => {
    const dir = await makeTempDir();
    const plan = {
      id: "PLN-nopaths",
      title: "No paths",
      tasks: [
        {
          id: "TSK-001",
          title: "Missing paths",
          description: "A valid description",
          filePaths: [],
          verificationCommand: "bun test",
          expectedOutput: "pass",
          estimatedMinutes: 3,
          status: "pending",
        },
      ],
    };
    const planPath = join(dir, "PLN-nopaths.json");
    await writeFile(planPath, JSON.stringify(plan));

    const result = await runPlan({ ref: "PLN-nopaths", cwd: dir, options: { planPath } });
    expect(result.passed).toBe(false);
    expect(result.details.some((d) => d.message.includes("no file paths"))).toBe(true);
  });
});

// ── Security Secrets Gate ─────────────────────────────────────────────────────

describe("security-secrets gate", () => {
  test("passes a clean directory", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "clean.ts"), `const greeting = "hello world";\n`);

    const result = await runSecretsGate({ ref: "test-ref", cwd: dir });
    expect(result.passed).toBe(true);
    expect(result.name).toBe("security-secrets");
  });

  test("fails when AWS key pattern found", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "bad.ts"), `const key = "AKIAIOSFODNN7EXAMPLE";\n`);

    const result = await runSecretsGate({ ref: "test-ref", cwd: dir });
    expect(result.passed).toBe(false);
    expect(result.details.some((d) => d.severity === "error")).toBe(true);
  });

  test("fails when private key header found", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "key.ts"), `const pem = "-----BEGIN RSA PRIVATE KEY-----";\n`);

    const result = await runSecretsGate({ ref: "test-ref", cwd: dir });
    expect(result.passed).toBe(false);
  });

  test("does not flag env-backed secret variables as literal secrets", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "config.ts"), `const secret = process.env["APP_SECRET"];\n`);

    const result = await runSecretsGate({ ref: "test-ref", cwd: dir });
    expect(result.passed).toBe(true);
  });

  test("ignores test and gate fixture files", async () => {
    const dir = await makeTempDir();
    await mkdir(join(dir, "tests"), { recursive: true });
    await mkdir(join(dir, "gates"), { recursive: true });
    await writeFile(join(dir, "tests", "secret.test.ts"), `const key = "AKIAIOSFODNN7EXAMPLE";\n`);
    await writeFile(join(dir, "gates", "secret-detector.ts"), `const secret = "topsecret123";\n`);

    const result = await runSecretsGate({ ref: "test-ref", cwd: dir });
    expect(result.passed).toBe(true);
  });
});

// ── Security SAST Gate ────────────────────────────────────────────────────────

describe("security-sast gate", () => {
  test("passes clean TypeScript file", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "safe.ts"), `export function add(a: number, b: number): number { return a + b; }\n`);

    const result = await runSastGate({ ref: "test-ref", cwd: dir });
    expect(result.passed).toBe(true);
  });

  test("fails on eval() usage", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "unsafe.ts"), `const x = eval("1 + 2");\n`);

    const result = await runSastGate({ ref: "test-ref", cwd: dir });
    expect(result.passed).toBe(false);
    expect(result.details.some((d) => d.message.includes("SAST-001"))).toBe(true);
  });

  test("fails on dangerouslySetInnerHTML", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "unsafe.tsx"), `const el = <div dangerouslySetInnerHTML={{ __html: userInput }} />;\n`);

    const result = await runSastGate({ ref: "test-ref", cwd: dir });
    expect(result.passed).toBe(false);
    expect(result.details.some((d) => d.message.includes("SAST-005"))).toBe(true);
  });

  test("warns on Math.random() but still passes", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "warn.ts"), `const n = Math.random();\n`);

    const result = await runSastGate({ ref: "test-ref", cwd: dir });
    // SAST-004 is warn severity — should still pass (no critical)
    expect(result.passed).toBe(true);
    expect(result.details.some((d) => d.message.includes("SAST-004"))).toBe(true);
  });

  test("does not flag guarded process.env access", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "config.ts"), `const value = process.env["APP_SECRET"];\nif (!value) throw new Error("missing");\n`);

    const result = await runSastGate({ ref: "test-ref", cwd: dir });
    expect(result.passed).toBe(true);
  });

  test("ignores detector and test fixture files", async () => {
    const dir = await makeTempDir();
    await mkdir(join(dir, "tests"), { recursive: true });
    await mkdir(join(dir, "gates"), { recursive: true });
    await writeFile(join(dir, "tests", "unsafe.test.ts"), `const x = eval("1 + 2");\n`);
    await writeFile(join(dir, "gates", "security-sast.ts"), `const el = <div dangerouslySetInnerHTML={{ __html: userInput }} />;\n`);

    const result = await runSastGate({ ref: "test-ref", cwd: dir });
    expect(result.passed).toBe(true);
  });
});

describe("coverage gate", () => {
  test("extracts line coverage from Bun text reporter output", () => {
    const output = [
      "------------------------------|---------|---------|-------------------",
      "File                          | % Funcs | % Lines | Uncovered Line #s",
      "------------------------------|---------|---------|-------------------",
      "All files                     |   83.65 |   83.92 |",
    ].join("\n");

    expect(extractCoveragePct(output)).toBe(83.92);
  });
});
