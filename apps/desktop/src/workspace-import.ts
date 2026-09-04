import { randomUUID } from "node:crypto";
import { cp, lstat, mkdir, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { createDatabase } from "../../server/src/db/client";
import { migrateDatabase } from "../../server/src/db/migrate";
import { AuthService } from "../../server/src/services/auth.service";

async function rejectSymbolicLinks(directory: string): Promise<void> {
  const stat = await lstat(directory);
  if (stat.isSymbolicLink()) throw new Error("IMPORT_SYMLINK_NOT_ALLOWED");
  if (!stat.isDirectory()) return;
  for (const entry of await readdir(directory))
    await rejectSymbolicLinks(path.join(directory, entry));
}

/** Prepare a consistent SQLite snapshot before replacing only a fresh desktop workspace. */
export async function importWorkspace(source: string, destination: string) {
  const sourceDatabase = path.join(source, "data/daily-life.sqlite");
  await rejectSymbolicLinks(sourceDatabase);
  const storage = path.join(destination, "storage");
  const existing = createDatabase(path.join(storage, "daily-life.sqlite"));
  try {
    if (new AuthService(existing.db, 30).listAccounts().length > 0)
      throw new Error("IMPORT_REQUIRES_EMPTY_WORKSPACE");
  } finally {
    existing.close();
  }
  const stage = path.join(destination, `import-${randomUUID()}`);
  const previous = path.join(destination, `empty-${randomUUID()}`);
  await mkdir(stage, { recursive: true });
  try {
    const sourceConnection = new Database(sourceDatabase, { readonly: true, fileMustExist: true });
    try {
      await sourceConnection.backup(path.join(stage, "daily-life.sqlite"));
    } finally {
      sourceConnection.close();
    }
    const snapshot = createDatabase(path.join(stage, "daily-life.sqlite"));
    try {
      migrateDatabase(snapshot);
      if (new AuthService(snapshot.db, 30).listAccounts().length === 0)
        throw new Error("IMPORT_HAS_NO_ACCOUNTS");
    } finally {
      snapshot.close();
    }
    const uploads = path.join(source, "uploads");
    const uploadStat = await lstat(uploads).catch((error: unknown) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
      throw error;
    });
    if (uploadStat) {
      await rejectSymbolicLinks(uploads);
      await cp(uploads, path.join(stage, "uploads"), { recursive: true });
    }
    await rename(storage, previous);
    try {
      await rename(stage, storage);
    } catch (error) {
      await rename(previous, storage);
      throw error;
    }
    await rm(previous, { recursive: true });
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}
