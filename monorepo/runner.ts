import { getAffected } from "./affected";
import { buildWorkspaceInfo, type PackageDirs } from "./graph";

type Script = "test" | "build";

/**
 * Runs a script (test | build) on affected packages in topological order.
 */
export async function runAffected(rootDir: string, sinceRef: string, script: Script): Promise<void> {
  const affected = await getAffected(rootDir, sinceRef);

  if (affected.length === 0) {
    console.log("No affected packages — nothing to run.");
    return;
  }

  const { graph, packageDirs } = await buildWorkspaceInfo(rootDir);
  const ordered = topoSort(affected, graph);

  console.log(`Running ${script} on ${ordered.length} packages in topological order:\n`);

  let failed = 0;
  for (const pkg of ordered) {
    process.stdout.write(`  ${pkg} ... `);
    const result = await runPackageScript(packageDirs, pkg, script);
    if (result.success) {
      console.log("✓");
    } else {
      console.log("✗");
      console.error(result.output);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`\n✗ ${failed}/${ordered.length} packages failed`);
    process.exit(1);
  } else {
    console.log(`\n✓ All ${ordered.length} packages passed`);
  }
}

function topoSort(packages: string[], graph: Record<string, string[]>): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  function visit(pkg: string): void {
    if (visited.has(pkg)) return;
    visited.add(pkg);
    for (const dep of (graph[pkg] ?? [])) {
      if (packages.includes(dep)) visit(dep);
    }
    result.push(pkg);
  }

  for (const pkg of packages) visit(pkg);
  return result;
}

async function runPackageScript(
  packageDirs: PackageDirs,
  pkg: string,
  script: Script
): Promise<{ success: boolean; output: string }> {
  const cwd = packageDirs[pkg];
  if (!cwd) {
    return { success: false, output: `Package directory not found for ${pkg}` };
  }

  const proc = Bun.spawn(["bun", "run", script], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return {
    success: exitCode === 0,
    output: (stdout + stderr).trim(),
  };
}
