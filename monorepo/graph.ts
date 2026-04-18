import { dirname, join, normalize } from "node:path";

export type DependencyGraph = Record<string, string[]>;
export type PackageDirs = Record<string, string>;

export type WorkspaceInfo = {
  graph: DependencyGraph;
  packageDirs: PackageDirs;
};

type PackageJson = {
  name?: string;
  workspaces?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

/**
 * Builds a dependency DAG for all packages in a Bun/npm workspace.
 * Returns { packageName: [dependencyPackageNames] }
 */
export async function buildGraph(rootDir: string): Promise<DependencyGraph> {
  const info = await buildWorkspaceInfo(rootDir);
  return info.graph;
}

export async function buildWorkspaceInfo(rootDir: string): Promise<WorkspaceInfo> {
  const rootPkg = await readPackageJson(join(rootDir, "package.json"));
  const workspaceGlobs = rootPkg.workspaces ?? [];

  const packageDirs = await resolveWorkspaceDirs(rootDir, workspaceGlobs);
  const nameToDir = new Map<string, string>();

  // First pass: collect all package names
  for (const dir of packageDirs) {
    const pkg = await readPackageJson(join(dir, "package.json"));
    if (pkg.name) nameToDir.set(pkg.name, dir);
  }

  const graph: DependencyGraph = {};

  // Second pass: build edges
  for (const [name, dir] of nameToDir) {
    const pkg = await readPackageJson(join(dir, "package.json"));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    const internalDeps = Object.keys(allDeps).filter((dep) => nameToDir.has(dep));
    graph[name] = internalDeps;
  }

  return {
    graph,
    packageDirs: Object.fromEntries(nameToDir.entries()),
  };
}

async function resolveWorkspaceDirs(rootDir: string, globs: string[]): Promise<string[]> {
  const dirs: string[] = [];

  for (const pattern of globs) {
    const glob = new Bun.Glob(pattern + "/package.json");
    for await (const file of glob.scan({ cwd: rootDir, absolute: true })) {
      dirs.push(normalize(dirname(file)));
    }
  }

  // Always include root if it has a name
  dirs.push(normalize(rootDir));
  return [...new Set(dirs)];
}

async function readPackageJson(path: string): Promise<PackageJson> {
  try {
    return await Bun.file(path).json() as PackageJson;
  } catch {
    return {};
  }
}
