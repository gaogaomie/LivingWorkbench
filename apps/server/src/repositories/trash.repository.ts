import type { TrashItem, TrashSource } from "@daily-life/shared";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import {
  financeEntries,
  fitnessLogs,
  habits,
  mediaItems,
  shoppingItems,
  todos,
} from "../db/schema";

export type TrashWriteResult = "deleted" | "restored" | "not_found" | "conflict";

function nextTimestamp(previous: string): string {
  const now = new Date().toISOString();
  return now > previous ? now : new Date(Date.parse(previous) + 1).toISOString();
}

export class TrashRepository {
  constructor(private readonly db: AppDatabase) {}

  list(userId: string): TrashItem[] {
    const items: TrashItem[] = [];
    const add = (
      source: TrashSource,
      rows: Array<{ id: string; label: string; deletedAt: string | null; updatedAt: string }>,
    ) => {
      for (const row of rows) {
        if (row.deletedAt) items.push({ ...row, source, deletedAt: row.deletedAt });
      }
    };

    add(
      "finance",
      this.db
        .select({
          id: financeEntries.id,
          label: financeEntries.note,
          deletedAt: financeEntries.deletedAt,
          updatedAt: financeEntries.updatedAt,
        })
        .from(financeEntries)
        .where(and(eq(financeEntries.userId, userId), isNotNull(financeEntries.deletedAt)))
        .orderBy(desc(financeEntries.deletedAt))
        .all()
        .map((row) => ({ ...row, label: row.label || "财务记录" })),
    );
    add(
      "habit",
      this.db
        .select({
          id: habits.id,
          label: habits.name,
          deletedAt: habits.deletedAt,
          updatedAt: habits.updatedAt,
        })
        .from(habits)
        .where(and(eq(habits.userId, userId), isNotNull(habits.deletedAt)))
        .all(),
    );
    add(
      "fitness",
      this.db
        .select({
          id: fitnessLogs.id,
          label: fitnessLogs.date,
          deletedAt: fitnessLogs.deletedAt,
          updatedAt: fitnessLogs.updatedAt,
        })
        .from(fitnessLogs)
        .where(and(eq(fitnessLogs.userId, userId), isNotNull(fitnessLogs.deletedAt)))
        .all()
        .map((row) => ({ ...row, label: `${row.label} 健身记录` })),
    );
    add(
      "schedule",
      this.db
        .select({
          id: todos.id,
          label: todos.title,
          deletedAt: todos.deletedAt,
          updatedAt: todos.updatedAt,
        })
        .from(todos)
        .where(and(eq(todos.userId, userId), isNotNull(todos.deletedAt)))
        .all(),
    );
    add(
      "shopping",
      this.db
        .select({
          id: shoppingItems.id,
          label: shoppingItems.name,
          deletedAt: shoppingItems.deletedAt,
          updatedAt: shoppingItems.updatedAt,
        })
        .from(shoppingItems)
        .where(and(eq(shoppingItems.userId, userId), isNotNull(shoppingItems.deletedAt)))
        .all(),
    );
    add(
      "media",
      this.db
        .select({
          id: mediaItems.id,
          label: mediaItems.name,
          deletedAt: mediaItems.deletedAt,
          updatedAt: mediaItems.updatedAt,
        })
        .from(mediaItems)
        .where(and(eq(mediaItems.userId, userId), isNotNull(mediaItems.deletedAt)))
        .all(),
    );
    return items.sort((left, right) => right.deletedAt.localeCompare(left.deletedAt)).slice(0, 50);
  }

  delete(
    userId: string,
    source: TrashSource,
    id: string,
    expectedUpdatedAt: string,
  ): TrashWriteResult {
    return this.write(userId, source, id, expectedUpdatedAt, "delete");
  }

  restore(
    userId: string,
    source: TrashSource,
    id: string,
    expectedDeletedAt: string,
  ): TrashWriteResult {
    return this.write(userId, source, id, expectedDeletedAt, "restore");
  }

  private write(
    userId: string,
    source: TrashSource,
    id: string,
    expectedTimestamp: string,
    operation: "delete" | "restore",
  ): TrashWriteResult {
    const table = {
      finance: financeEntries,
      habit: habits,
      fitness: fitnessLogs,
      schedule: todos,
      shopping: shoppingItems,
      media: mediaItems,
    }[source];
    const current = this.db
      .select({ updatedAt: table.updatedAt, deletedAt: table.deletedAt })
      .from(table)
      .where(and(eq(table.id, id), eq(table.userId, userId)))
      .get();
    if (!current) return "not_found";

    if (operation === "delete") {
      if (current.deletedAt) return "not_found";
      if (current.updatedAt !== expectedTimestamp) return "conflict";
      const deletedAt = nextTimestamp(current.updatedAt);
      this.db.update(table).set({ deletedAt, updatedAt: deletedAt }).where(eq(table.id, id)).run();
      return "deleted";
    }

    if (!current.deletedAt) return "not_found";
    if (current.deletedAt !== expectedTimestamp) return "conflict";
    this.db
      .update(table)
      .set({ deletedAt: null, updatedAt: nextTimestamp(current.updatedAt) })
      .where(eq(table.id, id))
      .run();
    return "restored";
  }
}
