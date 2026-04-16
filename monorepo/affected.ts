import { buildWorkspaceInfo, type PackageDirs } from "./graph";
import { join } from "node:path";

/**
 * Returns package names that were touched by commits since `sinceRef`,
 * plus any packages that transitively depend on them.
 */
export async function getAffected(rootDir: string, sinceRef: string): Promise<string[]> {
  const changedFiles = await getChangedFiles(rootDir, sinceRef);
  const { graph, packageDirs } = await buildWorkspaceInfo(rootDir);

  // Build reverse dependency map: dep → [packages that depend on dep]
  const reverseDeps = buildReverseDeps(graph);

  // Map each changed file to its owning package
  const directlyAffected = new Set<string>();
  for (const file of changedFiles) {
    const pkg = fileToPackage(rootDir, file, packageDirs);
    if (pkg) directlyAffected.add(pkg);
  }

  // Walk reverse deps to find transitively affected packages
  const allAffected = new Set<string>(directlyAffected);
  const queue = [...directlyAffected];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = reverseDeps.get(current) ?? [];
    for (const dep of dependents) {
      if (!allAffected.has(dep)) {
        allAffected.add(dep);
        queue.push(dep);
      }
    }
  }

  return [...allAffected].sort();
}

async function getChangedFiles(cwd: string, sinceRef: string): Promise<string[]> {
  const proc = Bun.spawn(
    ["git", "diff", "--name-only", `${sinceRef}...HEAD`],
    { cwd, stdout: "pipe", stderr: "pipe" }
  );
  await proc.exited;
  const output = (await new Response(proc.stdout).text()).trim();
  return output ? output.split("\n") : [];
}

function buildReverseDeps(graph: Record<string, string[]>): Map<string, string[]> {
  const reverse = new Map<string, string[]>();
  for (const [pkg, deps] of Object.entries(graph)) {
    for (const dep of deps) {
      const list = reverse.get(dep) ?? [];
      list.push(pkg);
      reverse.set(dep, list);
    }
  }
  return reverse;
}

function fileToPackage(
  rootDir: string,
  file: string,
  packageDirs: PackageDirs
): string | undefined {
  const absFile = join(rootDir, file);
  let bestMatch: { pkg: string; dir: string } | undefined;

  for (const [pkg, dir] of Object.entries(packageDirs)) {
    if (absFile === dir || absFile.startsWith(`${dir}/`)) {
      if (!bestMatch || dir.length > bestMatch.dir.length) {
        bestMatch = { pkg, dir };
      }
    }
  }

  return bestMatch?.pkg;
}
