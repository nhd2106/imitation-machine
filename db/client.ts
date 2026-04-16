import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";

export function resolveDbPath(env: NodeJS.ProcessEnv = process.env): string {
  return env["AGENTIC_DB_PATH"] ?? ".agentic/state.db";
}

const DB_PATH = resolveDbPath();
mkdirSync(dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH, { create: true });
sqlite.exec("PRAGMA journal_mode=WAL;");
sqlite.exec("PRAGMA foreign_keys=ON;");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
