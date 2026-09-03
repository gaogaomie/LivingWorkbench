import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { readServerConfig } from "../config/env";
import { createDatabase, type DatabaseConnection } from "./client";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const sourceMigrationsFolder = path.resolve(moduleDirectory, "./migrations");
const bundledMigrationsFolder = path.resolve(moduleDirectory, "../src/db/migrations");
const migrationsFolder = fs.existsSync(sourceMigrationsFolder)
  ? sourceMigrationsFolder
  : bundledMigrationsFolder;

export function runMigrations(databasePath: string): void {
  const database = createDatabase(databasePath);

  try {
    migrateDatabase(database);
  } finally {
    database.close();
  }
}

export function migrateDatabase(database: DatabaseConnection): void {
  migrate(database.db, { migrationsFolder });
  const integrity = database.sqlite.pragma("quick_check", { simple: true });
  if (integrity !== "ok") {
    throw new Error(`SQLite quick_check failed: ${String(integrity)}`);
  }
}

if (import.meta.main) {
  runMigrations(readServerConfig().databasePath);
}
