import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export type AgenticMode = "lite" | "standard" | "strict";
export type AgenticModeSource = "override" | "repo-config" | "fallback";

export type ModeResolution = {
  mode: AgenticMode;
  source: AgenticModeSource;
  projectRoot: string;
  storePath: string;
  configPath?: string;
  warnings: string[];
};

export type ModePolicy = {
  allowWriteWithoutWorkflowSkill: boolean;
  allowBashWithoutWorkflowSkill: boolean;
  summary: string;
};

export type ModeOverrideStore = {
  version: 1;
  overrides: Record<string, string>;
};

type MutableModeOverrideStore = {
  version: 1;
  overrides: Record<string, unknown>;
};

type JsonReadResult = {
  value: unknown;
  warnings: string[];
  parseFailed: boolean;
};

const VALID_MODES = new Set<AgenticMode>(["lite", "standard", "strict"]);
const DEFAULT_MODE: AgenticMode = "standard";
const DEFAULT_SOURCE: AgenticModeSource = "fallback";

export function normalizeProjectPath(projectRoot: string): string {
  return path.resolve(projectRoot);
}

export function normalizeMode(value: unknown): AgenticMode | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return VALID_MODES.has(normalized as AgenticMode) ? (normalized as AgenticMode) : null;
}

export function getModeOverrideStorePath(customPath?: string): string {
  if (customPath && customPath.trim()) return customPath;
  if (process.env.AGENTIC_MODE_STORE_PATH?.trim()) return process.env.AGENTIC_MODE_STORE_PATH;
  return path.join(homedir(), ".config", "imitation-machine", "project-mode-overrides.json");
}

export async function readModeOverrideStore(storePath = getModeOverrideStorePath()): Promise<ModeOverrideStore> {
  const { store } = await inspectModeOverrideStore(storePath);
  return store;
}

export async function writeProjectModeOverride(
  { projectRoot, mode, storePath = getModeOverrideStorePath() }: { projectRoot: string; mode: AgenticMode; storePath?: string },
): Promise<void> {
  const normalizedMode = normalizeMode(mode);
  if (!normalizedMode) {
    throw new Error(`Invalid mode: ${mode}`);
  }

  const store = await readModeOverrideStoreForMutation(storePath);
  store.overrides[normalizeProjectPath(projectRoot)] = normalizedMode;
  await persistModeOverrideStore(storePath, store);
}

export async function clearProjectModeOverride(
  { projectRoot, storePath = getModeOverrideStorePath() }: { projectRoot: string; storePath?: string },
): Promise<void> {
  const store = await readModeOverrideStoreForMutation(storePath);
  delete store.overrides[normalizeProjectPath(projectRoot)];
  await persistModeOverrideStore(storePath, store);
}

export async function resolveProjectMode(
  { projectRoot, storePath = getModeOverrideStorePath() }: { projectRoot: string; storePath?: string },
): Promise<ModeResolution> {
  const normalizedProjectRoot = normalizeProjectPath(projectRoot);
  const { store, warnings } = await inspectModeOverrideStore(storePath, normalizedProjectRoot);
  const overrideMode = normalizeMode(store.overrides[normalizedProjectRoot]);
  if (overrideMode) {
    return {
      mode: overrideMode,
      source: "override",
      projectRoot: normalizedProjectRoot,
      storePath,
      warnings,
    };
  }

  const repoConfig = await readRepoModeConfig(normalizedProjectRoot);
  if (repoConfig.mode) {
    return {
      mode: repoConfig.mode,
      source: "repo-config",
      projectRoot: normalizedProjectRoot,
      storePath,
      configPath: repoConfig.configPath,
      warnings: [...warnings, ...repoConfig.warnings],
    };
  }

  return {
    mode: DEFAULT_MODE,
    source: DEFAULT_SOURCE,
    projectRoot: normalizedProjectRoot,
    storePath,
    configPath: repoConfig.configPath,
    warnings: [...warnings, ...repoConfig.warnings],
  };
}

export function getModePolicy(mode: AgenticMode): ModePolicy {
  switch (mode) {
    case "lite":
      return {
        allowWriteWithoutWorkflowSkill: true,
        allowBashWithoutWorkflowSkill: true,
        summary: "Lite relaxes the pre-workflow guard after bootstrap: bash and file writes are allowed without an implementation workflow skill.",
      };
    case "strict":
      return {
        allowWriteWithoutWorkflowSkill: false,
        allowBashWithoutWorkflowSkill: false,
        summary: "Strict requires a workflow skill before bash or file writes.",
      };
    case "standard":
    default:
      return {
        allowWriteWithoutWorkflowSkill: false,
        allowBashWithoutWorkflowSkill: true,
        summary: "Standard preserves the current default: bash is allowed after bootstrap, writes require a workflow skill.",
      };
  }
}

async function inspectModeOverrideStore(storePath: string, projectRoot?: string): Promise<{ store: ModeOverrideStore; warnings: string[] }> {
  const file = Bun.file(storePath);
  if (!(await file.exists())) {
    return { store: { version: 1, overrides: {} }, warnings: [] };
  }

  const parsed = await readJsonFile(file, storePath);
  const rawOverrides = getRecord((parsed.value as { overrides?: unknown } | null)?.overrides);
  const overrides = Object.fromEntries(
    Object.entries(rawOverrides).filter(([key, value]) => typeof key === "string" && typeof value === "string"),
  ) as Record<string, string>;

  const warnings = [...parsed.warnings];
  if (projectRoot && Object.hasOwn(rawOverrides, projectRoot)) {
    const rawOverride = rawOverrides[projectRoot];
    const overrideWarning = getProjectOverrideWarning(rawOverride, storePath, projectRoot);
    if (overrideWarning) warnings.push(overrideWarning);
  }

  return {
    store: { version: 1, overrides },
    warnings,
  };
}

async function readModeOverrideStoreForMutation(storePath: string): Promise<MutableModeOverrideStore> {
  const file = Bun.file(storePath);
  if (!(await file.exists())) {
    return { version: 1, overrides: {} };
  }

  const parsed = await readJsonFile(file, storePath);
  if (parsed.parseFailed || !isModeOverrideStoreShape(parsed.value)) {
    throw new Error(`Mode override store is invalid: ${storePath}`);
  }

  return {
    version: 1,
    overrides: { ...parsed.value.overrides },
  };
}

async function readRepoModeConfig(projectRoot: string): Promise<{ mode: AgenticMode | null; configPath: string; warnings: string[] }> {
  const configPath = path.join(projectRoot, ".imitation-machine.json");
  const file = Bun.file(configPath);
  if (!(await file.exists())) {
    return { mode: null, configPath, warnings: [] };
  }

  const parsed = await readJsonFile(file, configPath);
  const rawMode = (parsed.value as { mode?: unknown } | null)?.mode;
  const mode = normalizeMode(rawMode);
  const warning = getRepoModeWarning(rawMode, configPath);

  return {
    mode,
    configPath,
    warnings: warning ? [...parsed.warnings, warning] : parsed.warnings,
  };
}

async function persistModeOverrideStore(storePath: string, store: MutableModeOverrideStore): Promise<void> {
  await mkdir(path.dirname(storePath), { recursive: true });
  await Bun.write(storePath, JSON.stringify(store, null, 2) + "\n");
}

async function readJsonFile(file: Bun.BunFile, filePath: string): Promise<JsonReadResult> {
  try {
    return { value: await file.json(), warnings: [], parseFailed: false };
  } catch {
    return { value: null, warnings: [`Ignoring malformed JSON in ${filePath}.`], parseFailed: true };
  }
}

function isModeOverrideStoreShape(value: unknown): value is ModeOverrideStore {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return record.version === 1 && typeof record.overrides === "object" && record.overrides !== null && !Array.isArray(record.overrides);
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function getRepoModeWarning(rawMode: unknown, configPath: string): string | null {
  if (typeof rawMode === "undefined") return null;
  if (typeof rawMode !== "string") return `Ignoring non-string repo mode in ${configPath}.`;
  if (normalizeMode(rawMode) === null) return `Ignoring malformed repo mode \"${rawMode}\" in ${configPath}.`;
  return null;
}

function getProjectOverrideWarning(rawOverride: unknown, storePath: string, projectRoot: string): string | null {
  if (typeof rawOverride !== "string") {
    return `Ignoring non-string project mode override in ${storePath} for ${projectRoot}.`;
  }

  if (normalizeMode(rawOverride) === null) {
    return `Ignoring malformed project mode override \"${rawOverride}\" in ${storePath}.`;
  }

  return null;
}
