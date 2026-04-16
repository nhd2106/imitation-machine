const REPO_USAGE = `
agentic repo — Mono-repo utilities

USAGE
  agentic repo graph                      Print dependency DAG
  agentic repo affected --since <sha>     List packages changed since SHA
  agentic repo test --since <sha>         Run tests on affected packages only
  agentic repo build --since <sha>        Build affected packages in topo order
`.trim();

export async function repoCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help") {
    console.log(REPO_USAGE);
    return;
  }

  // Imported lazily to avoid loading monorepo graph on every CLI invocation
  const { buildGraph } = await import("../../monorepo/graph");
  const { getAffected } = await import("../../monorepo/affected");
  const { runAffected } = await import("../../monorepo/runner");

  const subcommand = args[0];
  const since = getFlag(args, "--since");
  const cwd = getFlag(args, "--cwd") ?? process.cwd();

  switch (subcommand) {
    case "graph": {
      const graph = await buildGraph(cwd);
      console.log("\nDependency Graph:");
      for (const [pkg, deps] of Object.entries(graph)) {
        console.log(`  ${pkg} → [${deps.join(", ")}]`);
      }
      break;
    }
    case "affected": {
      if (!since) { console.error("Required: --since <sha>"); process.exit(1); }
      const affected = await getAffected(cwd, since);
      console.log("Affected packages:");
      for (const pkg of affected) console.log(`  ${pkg}`);
      break;
    }
    case "test": {
      if (!since) { console.error("Required: --since <sha>"); process.exit(1); }
      await runAffected(cwd, since, "test");
      break;
    }
    case "build": {
      if (!since) { console.error("Required: --since <sha>"); process.exit(1); }
      await runAffected(cwd, since, "build");
      break;
    }
    default:
      console.error(`Unknown repo subcommand: ${subcommand}`);
      process.exit(1);
  }
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx === -1 ? undefined : args[idx + 1];
}
