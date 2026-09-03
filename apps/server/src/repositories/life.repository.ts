import { randomUUID } from "node:crypto";
import type {
  CreateHabit,
  CreateMediaItem,
  CreateShoppingItem,
  CreateTodo,
  DueRemindersResponse,
  EditMediaItem,
  FitnessLogInput,
  FitnessProfileInput,
  FitnessResponse,
  HabitDayResponse,
  MediaResponse,
  OverviewResponse,
  ScheduleResponse,
  ShoppingResponse,
  TimelineItem,
  TimelineResponse,
  TimelineSource,
  TodoStatus,
  UpdateFitnessLog,
  UpdateHabit,
  UpdateShoppingItem,
  UpdateTodo,
} from "@daily-life/shared";
import { financeCategoryLabels, financeCategorySchema } from "@daily-life/shared";
import { and, asc, desc, eq, gte, isNotNull, isNull, lte, ne } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import {
  financeEntries,
  fitnessLogs,
  fitnessProfiles,
  habitLogs,
  habits,
  mediaItems,
  shoppingItems,
  todoLists,
  todos,
} from "../db/schema";
import type { FinanceRepository } from "./finance.repository";

const defaultTodoLists = [
  { name: "生活", colorKey: "app-teal" },
  { name: "工作", colorKey: "app-blue" },
  { name: "家庭", colorKey: "app-yellow" },
  { name: "个人", colorKey: "warm-peach-pink" },
] as const;

function nowIso(): string {
  return new Date().toISOString();
}

function nextTimestamp(previous: string): string {
  const now = nowIso();
  return now > previous ? now : new Date(Date.parse(previous) + 1).toISOString();
}

export type LifeWriteResult = "updated" | "not_found" | "conflict";

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function weekday(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

function reminderDateTime(date: string, time: string, minutesBefore: number): string {
  const value = new Date(`${date}T${time}:00.000Z`);
  value.setUTCMinutes(value.getUTCMinutes() - minutesBefore);
  return value.toISOString().slice(0, 16);
}

function inRange(date: string, from?: string, to?: string): boolean {
  return (!from || date >= from) && (!to || date <= to);
}

function financeCategoryLabel(value: string): string {
  const category = financeCategorySchema.safeParse(value);
  return category.success ? financeCategoryLabels[category.data] : financeCategoryLabels.other;
}

function calculateStreak(
  habit: typeof habits.$inferSelect,
  logsByDate: Map<string, boolean>,
  date: string,
): number {
  let streak = 0;
  for (let offset = 0; offset > -366; offset -= 1) {
    const currentDate = shiftDate(date, offset);
    if (currentDate < habit.startDate) break;
    if (!habit.weekdays.includes(weekday(currentDate))) continue;
    if (!logsByDate.get(currentDate)) break;
    streak += 1;
  }
  return streak;
}

export class HabitRepository {
  constructor(private readonly db: AppDatabase) {}

  create(userId: string, input: CreateHabit) {
    const now = nowIso();
    return this.db
      .insert(habits)
      .values({ ...input, userId, status: "active", createdAt: now, updatedAt: now })
      .returning()
      .get();
  }

  update(userId: string, id: string, input: UpdateHabit): LifeWriteResult {
    const current = this.db
      .select({ updatedAt: habits.updatedAt })
      .from(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, userId), isNull(habits.deletedAt)))
      .get();
    if (!current) return "not_found";
    if (current.updatedAt !== input.expectedUpdatedAt) return "conflict";
    const { expectedUpdatedAt: _, ...values } = input;
    this.db
      .update(habits)
      .set({ ...values, updatedAt: nextTimestamp(current.updatedAt) })
      .where(eq(habits.id, id))
      .run();
    return "updated";
  }

  recordProgress(userId: string, habitId: string, date: string, value: number): boolean {
    const habit = this.db
      .select()
      .from(habits)
      .where(and(eq(habits.id, habitId), eq(habits.userId, userId), isNull(habits.deletedAt)))
      .get();
    if (!habit) return false;
    const existing = this.db
      .select({ id: habitLogs.id })
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)))
      .get();
    const completed = value >= habit.targetValue;
    const now = nowIso();

    if (existing) {
      this.db
        .update(habitLogs)
        .set({ value, completed, updatedAt: now, deletedAt: null })
        .where(eq(habitLogs.id, existing.id))
        .run();
    } else {
      this.db
        .insert(habitLogs)
        .values({
          id: randomUUID(),
          userId,
          habitId,
          date,
          value,
          completed,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }
    return true;
  }

  updateStatus(userId: string, habitId: string, status: string): boolean {
    const changed = this.db
      .update(habits)
      .set({ status, updatedAt: nowIso() })
      .where(and(eq(habits.id, habitId), eq(habits.userId, userId), isNull(habits.deletedAt)))
      .run();
    return changed.changes > 0;
  }

  getDay(userId: string, date: string): HabitDayResponse {
    const habitRows = this.db
      .select()
      .from(habits)
      .where(and(eq(habits.userId, userId), isNull(habits.deletedAt)))
      .orderBy(asc(habits.sortOrder), asc(habits.createdAt))
      .all();
    const from = shiftDate(date, -29);
    const logRows = this.db
      .select()
      .from(habitLogs)
      .where(
        and(
          eq(habitLogs.userId, userId),
          gte(habitLogs.date, from),
          lte(habitLogs.date, date),
          isNull(habitLogs.deletedAt),
        ),
      )
      .all();
    const logsByHabit = new Map<string, Map<string, (typeof logRows)[number]>>();
    for (const log of logRows) {
      const values = logsByHabit.get(log.habitId) ?? new Map();
      values.set(log.date, log);
      logsByHabit.set(log.habitId, values);
    }

    const history = Array.from({ length: 30 }, (_, index) => ({
      date: shiftDate(date, index - 29),
      planned: 0,
      completed: 0,
      rate: 0,
    }));
    const historyByDate = new Map(history.map((day) => [day.date, day]));
    const items = habitRows.map((habit) => {
      const habitLogMap = logsByHabit.get(habit.id) ?? new Map();
      const completionMap = new Map(
        [...habitLogMap.entries()].map(([logDate, log]) => [logDate, log.completed]),
      );
      for (let offset = -29; offset <= 0; offset += 1) {
        const currentDate = shiftDate(date, offset);
        if (
          habit.status === "active" &&
          currentDate >= habit.startDate &&
          habit.weekdays.includes(weekday(currentDate))
        ) {
          const historyDay = historyByDate.get(currentDate);
          if (historyDay) {
            historyDay.planned += 1;
            if (completionMap.get(currentDate)) historyDay.completed += 1;
          }
        }
      }
      const todayLog = habitLogMap.get(date);
      return {
        id: habit.id,
        name: habit.name,
        targetType: habit.targetType as HabitDayResponse["items"][number]["targetType"],
        targetValue: habit.targetValue,
        unit: habit.unit,
        weekdays: habit.weekdays,
        startDate: habit.startDate,
        colorKey: habit.colorKey,
        status: habit.status as HabitDayResponse["items"][number]["status"],
        value: todayLog?.value ?? 0,
        completed: todayLog?.completed ?? false,
        streak: calculateStreak(habit, completionMap, date),
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt,
      };
    });
    const plannedToday = items.filter(
      (item) =>
        item.status === "active" && item.startDate <= date && item.weekdays.includes(weekday(date)),
    );
    for (const historyDay of history) {
      historyDay.rate = historyDay.planned ? historyDay.completed / historyDay.planned : 0;
    }
    const planned30 = history.reduce((total, day) => total + day.planned, 0);
    const completed30 = history.reduce((total, day) => total + day.completed, 0);

    return {
      date,
      items,
      history,
      summary: {
        planned: plannedToday.length,
        completed: plannedToday.filter((item) => item.completed).length,
        bestStreak: items.reduce((best, item) => Math.max(best, item.streak), 0),
        completionRate30: planned30 ? completed30 / planned30 : 0,
      },
    };
  }
}

export class FitnessRepository {
  constructor(private readonly db: AppDatabase) {}

  saveProfile(userId: string, input: FitnessProfileInput) {
    const existing = this.db
      .select({ id: fitnessProfiles.id })
      .from(fitnessProfiles)
      .where(and(eq(fitnessProfiles.userId, userId), eq(fitnessProfiles.singletonKey, "default")))
      .get();
    const now = nowIso();
    if (existing) {
      return this.db
        .update(fitnessProfiles)
        .set({ ...input, deletedAt: null, updatedAt: now })
        .where(eq(fitnessProfiles.id, existing.id))
        .returning()
        .get();
    }
    return this.db
      .insert(fitnessProfiles)
      .values({
        id: randomUUID(),
        userId,
        singletonKey: "default",
        ...input,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
  }

  saveLog(userId: string, input: FitnessLogInput) {
    const existing = this.db
      .select({ id: fitnessLogs.id })
      .from(fitnessLogs)
      .where(and(eq(fitnessLogs.userId, userId), eq(fitnessLogs.date, input.date)))
      .get();
    const now = nowIso();
    const values = { ...input, note: input.note ?? null, updatedAt: now, deletedAt: null };
    if (existing) {
      return this.db
        .update(fitnessLogs)
        .set(values)
        .where(eq(fitnessLogs.id, existing.id))
        .returning()
        .get();
    }
    return this.db
      .insert(fitnessLogs)
      .values({ ...values, userId, createdAt: now })
      .returning()
      .get();
  }

  updateLog(userId: string, id: string, input: UpdateFitnessLog): LifeWriteResult {
    const current = this.db
      .select({ updatedAt: fitnessLogs.updatedAt })
      .from(fitnessLogs)
      .where(
        and(eq(fitnessLogs.id, id), eq(fitnessLogs.userId, userId), isNull(fitnessLogs.deletedAt)),
      )
      .get();
    if (!current) return "not_found";
    if (current.updatedAt !== input.expectedUpdatedAt) return "conflict";
    const duplicateDate = this.db
      .select({ id: fitnessLogs.id })
      .from(fitnessLogs)
      .where(
        and(
          eq(fitnessLogs.userId, userId),
          eq(fitnessLogs.date, input.date),
          ne(fitnessLogs.id, id),
          isNull(fitnessLogs.deletedAt),
        ),
      )
      .get();
    if (duplicateDate) return "conflict";
    const { expectedUpdatedAt: _, ...values } = input;
    this.db
      .update(fitnessLogs)
      .set({ ...values, note: values.note ?? null, updatedAt: nextTimestamp(current.updatedAt) })
      .where(eq(fitnessLogs.id, id))
      .run();
    return "updated";
  }

  get(userId: string, today: string): FitnessResponse {
    const profileRow = this.db
      .select()
      .from(fitnessProfiles)
      .where(
        and(
          eq(fitnessProfiles.userId, userId),
          eq(fitnessProfiles.singletonKey, "default"),
          isNull(fitnessProfiles.deletedAt),
        ),
      )
      .get();
    const rows = this.db
      .select()
      .from(fitnessLogs)
      .where(and(eq(fitnessLogs.userId, userId), isNull(fitnessLogs.deletedAt)))
      .orderBy(desc(fitnessLogs.date))
      .limit(120)
      .all();
    const logs = rows.map((row) => ({
      id: row.id,
      date: row.date,
      weightGram: row.weightGram,
      bodyFatBasisPoints: row.bodyFatBasisPoints,
      calorieIntakeKcal: row.calorieIntakeKcal,
      exerciseMinutes: row.exerciseMinutes,
      steps: row.steps,
      note: row.note,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const profile = profileRow
      ? {
          id: profileRow.id,
          heightCm: profileRow.heightCm,
          birthYear: profileRow.birthYear,
          sexForFormula: profileRow.sexForFormula as "female" | "male" | null,
          startWeightGram: profileRow.startWeightGram,
          targetWeightGram: profileRow.targetWeightGram,
          targetDate: profileRow.targetDate,
          createdAt: profileRow.createdAt,
          updatedAt: profileRow.updatedAt,
        }
      : null;
    const currentWeightGram = logs.find((log) => log.weightGram !== null)?.weightGram ?? null;
    const recentWeights = logs
      .filter(
        (log) => log.weightGram !== null && log.date >= shiftDate(today, -6) && log.date <= today,
      )
      .map((log) => log.weightGram as number);
    const averageWeight7Gram = recentWeights.length
      ? Math.round(recentWeights.reduce((sum, value) => sum + value, 0) / recentWeights.length)
      : null;
    const distanceToTargetGram =
      currentWeightGram !== null &&
      profile?.targetWeightGram !== null &&
      profile?.targetWeightGram !== undefined
        ? currentWeightGram - profile.targetWeightGram
        : null;
    const bmi =
      currentWeightGram !== null && profile?.heightCm
        ? currentWeightGram / 1000 / (profile.heightCm / 100) ** 2
        : null;
    const progressDenominator =
      profile?.startWeightGram !== null &&
      profile?.startWeightGram !== undefined &&
      profile.targetWeightGram !== null
        ? profile.startWeightGram - profile.targetWeightGram
        : 0;
    const goalProgress =
      currentWeightGram !== null &&
      profile !== null &&
      profile.startWeightGram !== null &&
      progressDenominator !== 0
        ? Math.min(
            1,
            Math.max(0, (profile.startWeightGram - currentWeightGram) / progressDenominator),
          )
        : null;

    return {
      profile,
      logs,
      summary: {
        currentWeightGram,
        distanceToTargetGram,
        bmi: bmi === null ? null : Math.round(bmi * 10) / 10,
        averageWeight7Gram,
        goalProgress,
      },
    };
  }
}

export class TodoRepository {
  constructor(private readonly db: AppDatabase) {}

  private ensureDefaultLists(userId: string): void {
    const existing = this.db
      .select({ id: todoLists.id })
      .from(todoLists)
      .where(and(eq(todoLists.userId, userId), isNull(todoLists.deletedAt)))
      .limit(1)
      .get();
    if (existing) return;
    const now = nowIso();
    this.db
      .insert(todoLists)
      .values(
        defaultTodoLists.map((item, index) => ({
          id: randomUUID(),
          userId,
          ...item,
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .run();
  }

  create(userId: string, input: CreateTodo): boolean {
    this.ensureDefaultLists(userId);
    if (input.listId) {
      const list = this.db
        .select({ id: todoLists.id })
        .from(todoLists)
        .where(and(eq(todoLists.id, input.listId), eq(todoLists.userId, userId)))
        .get();
      if (!list) return false;
    }
    const now = nowIso();
    this.db
      .insert(todos)
      .values({
        ...input,
        note: input.note ?? null,
        userId,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return true;
  }

  update(userId: string, id: string, input: UpdateTodo): LifeWriteResult {
    const current = this.db
      .select({ updatedAt: todos.updatedAt })
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId), isNull(todos.deletedAt)))
      .get();
    if (!current) return "not_found";
    if (current.updatedAt !== input.expectedUpdatedAt) return "conflict";
    if (input.listId) {
      const list = this.db
        .select({ id: todoLists.id })
        .from(todoLists)
        .where(and(eq(todoLists.id, input.listId), eq(todoLists.userId, userId)))
        .get();
      if (!list) return "not_found";
    }
    const { expectedUpdatedAt: _, ...values } = input;
    this.db
      .update(todos)
      .set({ ...values, note: values.note ?? null, updatedAt: nextTimestamp(current.updatedAt) })
      .where(eq(todos.id, id))
      .run();
    return "updated";
  }

  updateStatus(userId: string, id: string, status: TodoStatus): boolean {
    const now = nowIso();
    const changed = this.db
      .update(todos)
      .set({ status, completedAt: status === "completed" ? now : null, updatedAt: now })
      .where(and(eq(todos.id, id), eq(todos.userId, userId), isNull(todos.deletedAt)))
      .run();
    return changed.changes > 0;
  }

  get(userId: string, today: string): ScheduleResponse {
    this.ensureDefaultLists(userId);
    const lists = this.db
      .select({ id: todoLists.id, name: todoLists.name, colorKey: todoLists.colorKey })
      .from(todoLists)
      .where(and(eq(todoLists.userId, userId), isNull(todoLists.deletedAt)))
      .orderBy(asc(todoLists.sortOrder))
      .all();
    const rows = this.db
      .select()
      .from(todos)
      .where(and(eq(todos.userId, userId), isNull(todos.deletedAt)))
      .orderBy(asc(todos.date), asc(todos.time), desc(todos.priority))
      .all();
    const items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      date: row.date,
      time: row.time,
      listId: row.listId,
      priority: row.priority as ScheduleResponse["items"][number]["priority"],
      note: row.note,
      reminderMinutesBefore:
        row.reminderMinutesBefore as ScheduleResponse["items"][number]["reminderMinutesBefore"],
      status: row.status as TodoStatus,
      completedAt: row.completedAt,
      isOverdue: row.status === "pending" && row.date < today,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const next7 = shiftDate(today, 6);
    return {
      lists,
      items,
      summary: {
        today: items.filter((item) => item.date === today && item.status === "pending").length,
        overdue: items.filter((item) => item.isOverdue).length,
        next7Days: items.filter(
          (item) => item.status === "pending" && item.date >= today && item.date <= next7,
        ).length,
        completed: items.filter((item) => item.status === "completed").length,
      },
    };
  }

  getDueReminders(userId: string, from: string, to: string): DueRemindersResponse["items"] {
    return this.db
      .select({
        id: todos.id,
        title: todos.title,
        date: todos.date,
        time: todos.time,
        reminderMinutesBefore: todos.reminderMinutesBefore,
      })
      .from(todos)
      .where(
        and(
          eq(todos.userId, userId),
          eq(todos.status, "pending"),
          isNotNull(todos.time),
          isNotNull(todos.reminderMinutesBefore),
          isNull(todos.deletedAt),
        ),
      )
      .all()
      .flatMap((item) => {
        if (item.time === null || item.reminderMinutesBefore === null) return [];
        const remindAt = reminderDateTime(item.date, item.time, item.reminderMinutesBefore);
        if (remindAt < from || remindAt > to) return [];
        return [
          {
            ...item,
            time: item.time,
            reminderMinutesBefore: item.reminderMinutesBefore as 0 | 10 | 30 | 60 | 1_440,
            remindAt,
          },
        ];
      })
      .sort((left, right) =>
        left.remindAt === right.remindAt
          ? left.title.localeCompare(right.title, "zh-CN")
          : left.remindAt.localeCompare(right.remindAt),
      );
  }
}

export class ShoppingRepository {
  constructor(private readonly db: AppDatabase) {}

  create(userId: string, input: CreateShoppingItem) {
    const now = nowIso();
    return this.db
      .insert(shoppingItems)
      .values({
        ...input,
        unit: input.unit ?? null,
        note: input.note ?? null,
        userId,
        status: "wanted",
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
  }

  update(userId: string, id: string, input: UpdateShoppingItem): LifeWriteResult {
    const current = this.db
      .select({ updatedAt: shoppingItems.updatedAt })
      .from(shoppingItems)
      .where(
        and(
          eq(shoppingItems.id, id),
          eq(shoppingItems.userId, userId),
          isNull(shoppingItems.deletedAt),
        ),
      )
      .get();
    if (!current) return "not_found";
    if (current.updatedAt !== input.expectedUpdatedAt) return "conflict";
    const { expectedUpdatedAt: _, ...values } = input;
    this.db
      .update(shoppingItems)
      .set({
        ...values,
        unit: values.unit ?? null,
        note: values.note ?? null,
        updatedAt: nextTimestamp(current.updatedAt),
      })
      .where(eq(shoppingItems.id, id))
      .run();
    return "updated";
  }

  updateStatus(
    userId: string,
    id: string,
    status: "wanted" | "purchased",
    actualUnitPriceFen: number | null,
    purchasedOn: string | null,
  ): boolean {
    const changed = this.db
      .update(shoppingItems)
      .set({
        status,
        actualUnitPriceFen: status === "purchased" ? actualUnitPriceFen : null,
        purchasedOn: status === "purchased" ? purchasedOn : null,
        updatedAt: nowIso(),
      })
      .where(
        and(
          eq(shoppingItems.id, id),
          eq(shoppingItems.userId, userId),
          isNull(shoppingItems.deletedAt),
        ),
      )
      .run();
    return changed.changes > 0;
  }

  get(userId: string, month: string): ShoppingResponse {
    const rows = this.db
      .select()
      .from(shoppingItems)
      .where(and(eq(shoppingItems.userId, userId), isNull(shoppingItems.deletedAt)))
      .orderBy(desc(shoppingItems.createdAt))
      .all();
    const items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      categoryId: row.categoryId as ShoppingResponse["items"][number]["categoryId"],
      estimatedUnitPriceFen: row.estimatedUnitPriceFen,
      priority: row.priority as ShoppingResponse["items"][number]["priority"],
      note: row.note,
      status: row.status as ShoppingResponse["items"][number]["status"],
      actualUnitPriceFen: row.actualUnitPriceFen,
      purchasedOn: row.purchasedOn,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    return {
      items,
      summary: {
        wantedCount: items.filter((item) => item.status === "wanted").length,
        estimatedBudgetFen: items
          .filter((item) => item.status === "wanted")
          .reduce((total, item) => total + (item.estimatedUnitPriceFen ?? 0) * item.quantity, 0),
        purchasedThisMonth: items.filter(
          (item) => item.status === "purchased" && item.purchasedOn?.startsWith(month),
        ).length,
      },
    };
  }
}

export class MediaRepository {
  constructor(private readonly db: AppDatabase) {}

  create(userId: string, input: CreateMediaItem) {
    const now = nowIso();
    return this.db
      .insert(mediaItems)
      .values({ ...input, review: input.review ?? null, userId, createdAt: now, updatedAt: now })
      .returning()
      .get();
  }

  edit(userId: string, id: string, input: EditMediaItem): LifeWriteResult {
    const current = this.db
      .select({ updatedAt: mediaItems.updatedAt })
      .from(mediaItems)
      .where(
        and(eq(mediaItems.id, id), eq(mediaItems.userId, userId), isNull(mediaItems.deletedAt)),
      )
      .get();
    if (!current) return "not_found";
    if (current.updatedAt !== input.expectedUpdatedAt) return "conflict";
    const { expectedUpdatedAt: _, ...values } = input;
    this.db
      .update(mediaItems)
      .set({
        ...values,
        review: values.review ?? null,
        updatedAt: nextTimestamp(current.updatedAt),
      })
      .where(eq(mediaItems.id, id))
      .run();
    return "updated";
  }

  update(
    userId: string,
    id: string,
    input: { status: string; rating: number | null; completedOn: string | null },
  ): boolean {
    const changed = this.db
      .update(mediaItems)
      .set({ ...input, updatedAt: nowIso() })
      .where(
        and(eq(mediaItems.id, id), eq(mediaItems.userId, userId), isNull(mediaItems.deletedAt)),
      )
      .run();
    return changed.changes > 0;
  }

  get(userId: string, year: string): MediaResponse {
    const rows = this.db
      .select()
      .from(mediaItems)
      .where(and(eq(mediaItems.userId, userId), isNull(mediaItems.deletedAt)))
      .orderBy(desc(mediaItems.recordedOn), desc(mediaItems.createdAt))
      .all();
    const items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as MediaResponse["items"][number]["type"],
      status: row.status as MediaResponse["items"][number]["status"],
      rating: row.rating,
      recordedOn: row.recordedOn,
      completedOn: row.completedOn,
      review: row.review,
      coverAssetId: row.coverAssetId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const completed = items.filter(
      (item) => item.status === "completed" && item.completedOn?.startsWith(year),
    );
    const rated = completed.filter((item) => item.rating !== null);
    const typeStats = new Map<string, { count: number; ratingTotal: number }>();
    const ratingDistribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    for (const item of completed) {
      const current = typeStats.get(item.type) ?? { count: 0, ratingTotal: 0 };
      current.count += 1;
      current.ratingTotal += item.rating ?? 0;
      typeStats.set(item.type, current);
      if (item.rating !== null) {
        const key = String(item.rating);
        ratingDistribution[key] = (ratingDistribution[key] ?? 0) + 1;
      }
    }
    const favoriteType = [...typeStats.entries()].sort(
      ([, left], [, right]) =>
        right.count - left.count || right.ratingTotal / right.count - left.ratingTotal / left.count,
    )[0]?.[0] as MediaResponse["summary"]["favoriteType"] | undefined;

    return {
      items,
      summary: {
        completedThisYear: completed.length,
        averageRating: rated.length
          ? Math.round(
              (rated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / rated.length) * 10,
            ) / 10
          : null,
        favoriteType: favoriteType ?? null,
        ratingDistribution,
      },
    };
  }
}

export class TimelineRepository {
  constructor(private readonly db: AppDatabase) {}

  getPage(
    userId: string,
    filters: {
      from?: string | undefined;
      to?: string | undefined;
      source?: TimelineSource | undefined;
      keyword?: string | undefined;
      cursor?: string | undefined;
      limit: number;
    },
  ): TimelineResponse {
    const items: TimelineItem[] = [];
    const keyword = filters.keyword?.toLocaleLowerCase("zh-CN");
    const add = (item: TimelineItem) => {
      if (
        inRange(item.date, filters.from, filters.to) &&
        (!filters.source || item.source === filters.source) &&
        (!keyword || `${item.title} ${item.summary}`.toLocaleLowerCase("zh-CN").includes(keyword))
      ) {
        items.push(item);
      }
    };

    for (const row of this.db
      .select()
      .from(financeEntries)
      .where(and(eq(financeEntries.userId, userId), isNull(financeEntries.deletedAt)))
      .all()) {
      add({
        id: `finance:${row.id}`,
        source: "finance",
        date: row.date,
        title: row.type === "income" ? "收入记录" : "支出记录",
        summary: `${financeCategoryLabel(row.categoryId)} · ¥${(row.amountFen / 100).toFixed(2)}${row.note ? ` · ${row.note}` : ""}`,
        to: "/finance",
        createdAt: row.createdAt,
      });
    }
    const habitNames = new Map(
      this.db
        .select({ id: habits.id, name: habits.name })
        .from(habits)
        .where(and(eq(habits.userId, userId), isNull(habits.deletedAt)))
        .all()
        .map((row) => [row.id, row.name]),
    );
    for (const row of this.db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.userId, userId), isNull(habitLogs.deletedAt)))
      .all()) {
      const habitName = habitNames.get(row.habitId);
      if (!habitName) continue;
      add({
        id: `habit:${row.id}`,
        source: "habit",
        date: row.date,
        title: habitName,
        summary: row.completed ? `完成 · ${row.value}` : `进度 · ${row.value}`,
        to: "/habits",
        createdAt: row.createdAt,
      });
    }
    for (const row of this.db
      .select()
      .from(fitnessLogs)
      .where(and(eq(fitnessLogs.userId, userId), isNull(fitnessLogs.deletedAt)))
      .all()) {
      const parts = [
        row.weightGram ? `${(row.weightGram / 1000).toFixed(1)} kg` : null,
        row.exerciseMinutes ? `运动 ${row.exerciseMinutes} 分钟` : null,
        row.steps ? `${row.steps} 步` : null,
      ].filter(Boolean);
      add({
        id: `fitness:${row.id}`,
        source: "fitness",
        date: row.date,
        title: "健身记录",
        summary: parts.join(" · ") || row.note || "记录了一次身体状态",
        to: "/fitness",
        createdAt: row.createdAt,
      });
    }
    for (const row of this.db
      .select()
      .from(todos)
      .where(and(eq(todos.userId, userId), isNull(todos.deletedAt)))
      .all()) {
      add({
        id: `schedule:${row.id}`,
        source: "schedule",
        date: row.completedAt?.slice(0, 10) ?? row.date,
        title: row.title,
        summary:
          row.status === "completed"
            ? "已完成"
            : row.time
              ? `${row.time} · 待处理`
              : "全天 · 待处理",
        to: "/schedule",
        createdAt: row.createdAt,
      });
    }
    for (const row of this.db
      .select()
      .from(shoppingItems)
      .where(and(eq(shoppingItems.userId, userId), isNull(shoppingItems.deletedAt)))
      .all()) {
      const date = row.purchasedOn ?? row.createdAt.slice(0, 10);
      add({
        id: `shopping:${row.id}`,
        source: "shopping",
        date,
        title: row.name,
        summary:
          row.status === "purchased"
            ? `已买 · ${row.quantity}${row.unit ?? "件"}`
            : `加入待买 · ${row.quantity}${row.unit ?? "件"}`,
        to: "/shopping",
        createdAt: row.createdAt,
      });
    }
    for (const row of this.db
      .select()
      .from(mediaItems)
      .where(and(eq(mediaItems.userId, userId), isNull(mediaItems.deletedAt)))
      .all()) {
      const date = row.completedOn ?? row.recordedOn;
      add({
        id: `media:${row.id}`,
        source: "media",
        date,
        title: row.name,
        summary:
          row.status === "completed"
            ? `已完成${row.rating ? ` · ${row.rating} 分` : ""}`
            : "加入收藏",
        to: "/media",
        createdAt: row.createdAt,
      });
    }

    const sorted = items.sort(compareTimelineItems);
    const sourceCounts: TimelineResponse["summary"]["sourceCounts"] = {
      finance: 0,
      habit: 0,
      fitness: 0,
      schedule: 0,
      shopping: 0,
      media: 0,
    };
    for (const item of sorted) sourceCounts[item.source] += 1;
    const summary: TimelineResponse["summary"] = {
      totalRecords: sorted.length,
      activeDays: new Set(sorted.map((item) => item.date)).size,
      sourceCounts,
    };
    const cursor = filters.cursor ? decodeTimelineCursor(filters.cursor) : null;
    const remaining = cursor
      ? sorted.filter((item) => compareTimelineItems(item, cursor) > 0)
      : sorted;
    const page = remaining.slice(0, filters.limit);
    const hasMore = remaining.length > page.length;
    const lastItem = page.at(-1);
    return {
      items: page,
      nextCursor: hasMore && lastItem ? encodeTimelineCursor(lastItem) : null,
      summary,
    };
  }
}

type TimelineCursor = Pick<TimelineItem, "id" | "date" | "createdAt">;

function compareTimelineItems(left: TimelineCursor, right: TimelineCursor): number {
  return (
    right.date.localeCompare(left.date) ||
    right.createdAt.localeCompare(left.createdAt) ||
    right.id.localeCompare(left.id)
  );
}

function encodeTimelineCursor(item: TimelineCursor): string {
  return Buffer.from(JSON.stringify([item.date, item.createdAt, item.id])).toString("base64url");
}

function decodeTimelineCursor(value: string): TimelineCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (Array.isArray(parsed) && parsed.length === 3) {
      const [date, createdAt, id] = parsed;
      if (typeof date === "string" && typeof createdAt === "string" && typeof id === "string") {
        return { date, createdAt, id };
      }
    }
  } catch {
    return null;
  }
  return null;
}

export class OverviewRepository {
  constructor(
    private readonly finance: FinanceRepository,
    private readonly habits: HabitRepository,
    private readonly todos: TodoRepository,
    private readonly timeline: TimelineRepository,
  ) {}

  get(userId: string, date: string): OverviewResponse {
    const finance = this.finance.getMonth(userId, date.slice(0, 7));
    const habits = this.habits.getDay(userId, date);
    const schedule = this.todos.get(userId, date);
    const recent = this.timeline.getPage(userId, {
      from: shiftDate(date, -30),
      to: date,
      limit: 3,
    });
    return {
      date,
      finance: {
        expenseFen: finance.summary.expenseFen,
        entryCount: finance.entries.length,
      },
      habits: {
        planned: habits.summary.planned,
        completed: habits.summary.completed,
      },
      schedule: {
        today: schedule.summary.today,
        overdue: schedule.summary.overdue,
      },
      recent: recent.items,
    };
  }
}
