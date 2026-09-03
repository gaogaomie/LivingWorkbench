import { randomUUID } from "node:crypto";
import type {
  CreateFinanceEntry,
  FinanceEntry,
  FinanceMonthResponse,
  SetMonthlyBudget,
  UpdateFinanceEntry,
} from "@daily-life/shared";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { financeEntries, monthlyBudgets } from "../db/schema";

export type WriteResult<T> =
  | { status: "created" | "updated" | "replayed"; value: T }
  | { status: "not_found" | "conflict" };

export interface FinanceRepository {
  createEntry(userId: string, input: CreateFinanceEntry): WriteResult<FinanceEntry>;
  updateEntry(userId: string, id: string, input: UpdateFinanceEntry): WriteResult<FinanceEntry>;
  deleteEntry(
    userId: string,
    id: string,
    expectedUpdatedAt: string,
  ): "deleted" | "not_found" | "conflict";
  getMonth(userId: string, month: string): FinanceMonthResponse;
  setBudget(userId: string, input: SetMonthlyBudget): number;
}

function nextTimestamp(previous?: string): string {
  const now = new Date().toISOString();
  if (!previous || now > previous) {
    return now;
  }
  return new Date(Date.parse(previous) + 1).toISOString();
}

function toEntry(row: typeof financeEntries.$inferSelect): FinanceEntry {
  return {
    id: row.id,
    type: row.type as FinanceEntry["type"],
    amountFen: row.amountFen,
    categoryId: row.categoryId as FinanceEntry["categoryId"],
    date: row.date,
    month: row.month,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function sameCreateInput(row: FinanceEntry, input: CreateFinanceEntry): boolean {
  return (
    row.type === input.type &&
    row.amountFen === input.amountFen &&
    row.categoryId === input.categoryId &&
    row.date === input.date &&
    row.note === (input.note ?? null)
  );
}

export class SqliteFinanceRepository implements FinanceRepository {
  constructor(private readonly db: AppDatabase) {}

  createEntry(userId: string, input: CreateFinanceEntry): WriteResult<FinanceEntry> {
    const existing = this.db
      .select()
      .from(financeEntries)
      .where(and(eq(financeEntries.id, input.id), eq(financeEntries.userId, userId)))
      .get();

    if (existing) {
      const entry = toEntry(existing);
      return sameCreateInput(entry, input)
        ? { status: "replayed", value: entry }
        : { status: "conflict" };
    }

    const now = nextTimestamp();
    const created = this.db
      .insert(financeEntries)
      .values({
        ...input,
        note: input.note ?? null,
        userId,
        month: input.date.slice(0, 7),
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return { status: "created", value: toEntry(created) };
  }

  updateEntry(userId: string, id: string, input: UpdateFinanceEntry): WriteResult<FinanceEntry> {
    const current = this.db
      .select()
      .from(financeEntries)
      .where(
        and(
          eq(financeEntries.id, id),
          eq(financeEntries.userId, userId),
          isNull(financeEntries.deletedAt),
        ),
      )
      .get();

    if (!current) return { status: "not_found" };
    if (current.updatedAt !== input.expectedUpdatedAt) return { status: "conflict" };

    const updated = this.db
      .update(financeEntries)
      .set({
        type: input.type,
        amountFen: input.amountFen,
        categoryId: input.categoryId,
        date: input.date,
        month: input.date.slice(0, 7),
        note: input.note ?? null,
        updatedAt: nextTimestamp(current.updatedAt),
      })
      .where(eq(financeEntries.id, id))
      .returning()
      .get();

    return { status: "updated", value: toEntry(updated) };
  }

  deleteEntry(
    userId: string,
    id: string,
    expectedUpdatedAt: string,
  ): "deleted" | "not_found" | "conflict" {
    const current = this.db
      .select({ updatedAt: financeEntries.updatedAt })
      .from(financeEntries)
      .where(
        and(
          eq(financeEntries.id, id),
          eq(financeEntries.userId, userId),
          isNull(financeEntries.deletedAt),
        ),
      )
      .get();

    if (!current) return "not_found";
    if (current.updatedAt !== expectedUpdatedAt) return "conflict";

    const deletedAt = nextTimestamp(current.updatedAt);
    this.db
      .update(financeEntries)
      .set({ deletedAt, updatedAt: deletedAt })
      .where(eq(financeEntries.id, id))
      .run();
    return "deleted";
  }

  getMonth(userId: string, month: string): FinanceMonthResponse {
    const rows = this.db
      .select()
      .from(financeEntries)
      .where(
        and(
          eq(financeEntries.userId, userId),
          eq(financeEntries.month, month),
          isNull(financeEntries.deletedAt),
        ),
      )
      .orderBy(desc(financeEntries.date), desc(financeEntries.createdAt))
      .all();
    const entries = rows.map(toEntry);
    const incomeFen = entries
      .filter((entry) => entry.type === "income")
      .reduce((total, entry) => total + entry.amountFen, 0);
    const expenseFen = entries
      .filter((entry) => entry.type === "expense")
      .reduce((total, entry) => total + entry.amountFen, 0);
    const budget = this.db
      .select({ amountFen: monthlyBudgets.amountFen })
      .from(monthlyBudgets)
      .where(
        and(
          eq(monthlyBudgets.userId, userId),
          eq(monthlyBudgets.month, month),
          isNull(monthlyBudgets.deletedAt),
        ),
      )
      .get();
    const categoryTotals = new Map<string, number>();
    for (const entry of entries) {
      if (entry.type === "expense") {
        categoryTotals.set(
          entry.categoryId,
          (categoryTotals.get(entry.categoryId) ?? 0) + entry.amountFen,
        );
      }
    }

    return {
      entries,
      summary: {
        month,
        incomeFen,
        expenseFen,
        balanceFen: incomeFen - expenseFen,
        budgetFen: budget?.amountFen ?? null,
        budgetRemainingFen: budget ? budget.amountFen - expenseFen : null,
        categoryBreakdown: [...categoryTotals.entries()]
          .map(([categoryId, amountFen]) => ({
            categoryId: categoryId as FinanceEntry["categoryId"],
            amountFen,
          }))
          .sort((left, right) => right.amountFen - left.amountFen),
      },
    };
  }

  setBudget(userId: string, input: SetMonthlyBudget): number {
    const current = this.db
      .select({ id: monthlyBudgets.id })
      .from(monthlyBudgets)
      .where(and(eq(monthlyBudgets.userId, userId), eq(monthlyBudgets.month, input.month)))
      .get();
    const now = nextTimestamp();

    this.db.transaction((tx) => {
      if (current) {
        tx.update(monthlyBudgets)
          .set({ amountFen: input.amountFen, deletedAt: null, updatedAt: now })
          .where(eq(monthlyBudgets.id, current.id))
          .run();
      } else {
        tx.insert(monthlyBudgets)
          .values({
            id: randomUUID(),
            userId,
            month: input.month,
            amountFen: input.amountFen,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }
    });

    return input.amountFen;
  }
}
