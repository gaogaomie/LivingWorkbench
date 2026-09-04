import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { createDatabase } from "../../server/src/db/client";
import { migrateDatabase } from "../../server/src/db/migrate";
import { AuthService } from "../../server/src/services/auth.service";
import { importWorkspace } from "./workspace-import";

const directories: string[] = [];
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "desktop-import-"));
  directories.push(root);
  const source = path.join(root, "source");
  const destination = path.join(root, "desktop");
  const sourceDb = createDatabase(path.join(source, "data/daily-life.sqlite"));
  migrateDatabase(sourceDb);
  await new AuthService(sourceDb.db, 30).initializeAdmin("owner", "test-password-123");
  const targetDb = createDatabase(path.join(destination, "storage/daily-life.sqlite"));
  migrateDatabase(targetDb);
  targetDb.close();
  await mkdir(path.join(source, "uploads"));
  await writeFile(path.join(source, "uploads/cover.txt"), "test attachment");
  return { source, destination, sourceDb };
}
afterEach(async () => {
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});
it("imports a live WAL database snapshot and attachments without changing the source", async () => {
  const { source, destination, sourceDb } = await fixture();
  try {
    await importWorkspace(source, destination);
    const target = createDatabase(path.join(destination, "storage/daily-life.sqlite"));
    try {
      expect(new AuthService(target.db, 30).listAccounts()[0]?.username).toBe("owner");
    } finally {
      target.close();
    }
    expect(await readFile(path.join(destination, "storage/uploads/cover.txt"), "utf8")).toBe(
      "test attachment",
    );
    expect(new AuthService(sourceDb.db, 30).listAccounts()[0]?.username).toBe("owner");
    await expect(importWorkspace(source, destination)).rejects.toThrow(
      "IMPORT_REQUIRES_EMPTY_WORKSPACE",
    );
  } finally {
    sourceDb.close();
  }
});
it("rejects symlink attachments and preserves the empty destination on failure", async () => {
  const { source, destination, sourceDb } = await fixture();
  try {
    await symlink(path.join(source, "data/daily-life.sqlite"), path.join(source, "uploads/link"));
    await expect(importWorkspace(source, destination)).rejects.toThrow(
      "IMPORT_SYMLINK_NOT_ALLOWED",
    );
    const target = createDatabase(path.join(destination, "storage/daily-life.sqlite"));
    try {
      expect(new AuthService(target.db, 30).listAccounts()).toHaveLength(0);
    } finally {
      target.close();
    }
  } finally {
    sourceDb.close();
  }
});
