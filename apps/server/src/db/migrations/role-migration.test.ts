import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "0001_overconfident_lenny_balinger.sql",
);

describe("account role migration", () => {
  it("promotes the existing active account and keeps the member default", () => {
    const sqlite = new Database(":memory:");
    try {
      sqlite.exec(`
        CREATE TABLE users (
          id text PRIMARY KEY NOT NULL,
          username text NOT NULL,
          password_hash text NOT NULL,
          created_at text NOT NULL,
          updated_at text NOT NULL,
          deleted_at text
        );
        INSERT INTO users VALUES (
          'existing-user',
          'owner',
          'hash',
          '2026-09-03T00:00:00.000Z',
          '2026-09-03T00:00:00.000Z',
          NULL
        );
      `);
      const migrationStatements = fs
        .readFileSync(migrationPath, "utf8")
        .split("--> statement-breakpoint");
      for (const statement of migrationStatements) {
        if (statement.trim()) {
          sqlite.exec(statement);
        }
      }

      expect(
        sqlite.prepare("SELECT role FROM users WHERE id = ?").pluck().get("existing-user"),
      ).toBe("admin");
      const columns = sqlite.prepare("PRAGMA table_info(users)").all();
      expect(columns).toContainEqual(
        expect.objectContaining({ name: "role", dflt_value: "'member'" }),
      );
    } finally {
      sqlite.close();
    }
  });
});
