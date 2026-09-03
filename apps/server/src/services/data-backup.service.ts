import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  type BackupData,
  type BackupDocument,
  backupDataSchema,
  type RestorePreflightResponse,
} from "@daily-life/shared";
import { eq } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import {
  appSettings,
  financeEntries,
  fitnessLogs,
  fitnessProfiles,
  habitLogs,
  habits,
  mediaItems,
  monthlyBudgets,
  shoppingItems,
  todoLists,
  todos,
} from "../db/schema";

const APP_VERSION = "0.1.0";
const BACKUP_KEYS = [
  "financeEntries",
  "monthlyBudgets",
  "habits",
  "habitLogs",
  "fitnessProfiles",
  "fitnessLogs",
  "todoLists",
  "todos",
  "shoppingItems",
  "mediaItems",
] as const;

function stripUserId<T extends { userId: string }>(row: T): Omit<T, "userId"> {
  const { userId: _, ...data } = row;
  return data;
}

function entityCounts(data: BackupData): Record<string, number> {
  return Object.fromEntries([
    ["settings", data.settings ? 1 : 0],
    ...BACKUP_KEYS.map((key) => [key, data[key].length]),
  ]);
}

function checksum(manifest: BackupDocument["manifest"], data: BackupData): string {
  return createHash("sha256").update(JSON.stringify({ manifest, data })).digest("hex");
}

function hasDuplicate<T>(items: T[], key: (item: T) => string): boolean {
  const seen = new Set<string>();
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) return true;
    seen.add(value);
  }
  return false;
}

function hasDuplicateId(items: ReadonlyArray<{ id: string }>): boolean {
  return hasDuplicate([...items], (item) => item.id);
}

export class BackupValidationError extends Error {}

export class DataBackupService {
  constructor(
    private readonly db: AppDatabase,
    private readonly backupDirectory: string | null,
  ) {}

  export(userId: string): BackupDocument {
    const settingsRow = this.db
      .select()
      .from(appSettings)
      .where(eq(appSettings.userId, userId))
      .get();
    const rawData = {
      settings: settingsRow ? stripUserId(settingsRow) : null,
      financeEntries: this.db
        .select()
        .from(financeEntries)
        .where(eq(financeEntries.userId, userId))
        .all()
        .map(stripUserId),
      monthlyBudgets: this.db
        .select()
        .from(monthlyBudgets)
        .where(eq(monthlyBudgets.userId, userId))
        .all()
        .map(stripUserId),
      habits: this.db.select().from(habits).where(eq(habits.userId, userId)).all().map(stripUserId),
      habitLogs: this.db
        .select()
        .from(habitLogs)
        .where(eq(habitLogs.userId, userId))
        .all()
        .map(stripUserId),
      fitnessProfiles: this.db
        .select()
        .from(fitnessProfiles)
        .where(eq(fitnessProfiles.userId, userId))
        .all()
        .map((row) => {
          const { singletonKey: _, ...item } = stripUserId(row);
          return item;
        }),
      fitnessLogs: this.db
        .select()
        .from(fitnessLogs)
        .where(eq(fitnessLogs.userId, userId))
        .all()
        .map(stripUserId),
      todoLists: this.db
        .select()
        .from(todoLists)
        .where(eq(todoLists.userId, userId))
        .all()
        .map(stripUserId),
      todos: this.db.select().from(todos).where(eq(todos.userId, userId)).all().map(stripUserId),
      shoppingItems: this.db
        .select()
        .from(shoppingItems)
        .where(eq(shoppingItems.userId, userId))
        .all()
        .map(stripUserId),
      mediaItems: this.db
        .select()
        .from(mediaItems)
        .where(eq(mediaItems.userId, userId))
        .all()
        .map((row) => ({ ...stripUserId(row), coverAssetId: null })),
    };
    const data = backupDataSchema.parse(rawData);
    const manifest: BackupDocument["manifest"] = {
      format: "riji-workbench-excel-backup",
      formatVersion: 1,
      appVersion: APP_VERSION,
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      locale: data.settings?.locale ?? "zh-CN",
      entityCounts: entityCounts(data),
      includesEncryptedSecrets: false,
    };
    return { manifest, data, checksumSha256: checksum(manifest, data) };
  }

  preflight(backup: BackupDocument): RestorePreflightResponse {
    const actualChecksum = checksum(backup.manifest, backup.data);
    if (actualChecksum !== backup.checksumSha256) {
      throw new BackupValidationError("备份校验失败，文件内容可能已损坏或被修改。");
    }
    const counts = entityCounts(backup.data);
    const countKeys = Object.keys(counts);
    if (
      Object.keys(backup.manifest.entityCounts).length !== countKeys.length ||
      countKeys.some((key) => backup.manifest.entityCounts[key] !== counts[key])
    ) {
      throw new BackupValidationError("备份中的实体数量与清单不一致。");
    }
    for (const key of BACKUP_KEYS) {
      if (hasDuplicateId(backup.data[key])) {
        throw new BackupValidationError(`备份的 ${key} 中包含重复 ID。`);
      }
    }
    const habitIds = new Set(backup.data.habits.map((item) => item.id));
    if (backup.data.habitLogs.some((item) => !habitIds.has(item.habitId))) {
      throw new BackupValidationError("备份包含找不到所属习惯的打卡记录。");
    }
    const listIds = new Set(backup.data.todoLists.map((item) => item.id));
    if (backup.data.todos.some((item) => item.listId !== null && !listIds.has(item.listId))) {
      throw new BackupValidationError("备份包含找不到所属清单的待办事项。");
    }
    if (backup.data.fitnessProfiles.length > 1) {
      throw new BackupValidationError("备份包含多个健身档案，无法整体恢复。");
    }
    if (hasDuplicate(backup.data.monthlyBudgets, (item) => item.month)) {
      throw new BackupValidationError("备份包含重复月份的预算。");
    }
    if (hasDuplicate(backup.data.habitLogs, (item) => `${item.habitId}:${item.date}`)) {
      throw new BackupValidationError("备份包含同一习惯同一天的重复打卡记录。");
    }
    if (hasDuplicate(backup.data.fitnessLogs, (item) => item.date)) {
      throw new BackupValidationError("备份包含同一天的重复健身记录。");
    }
    if (hasDuplicate(backup.data.todoLists, (item) => item.name)) {
      throw new BackupValidationError("备份包含重名的日程清单。");
    }
    if (
      backup.data.todos.some((item) => item.reminderMinutesBefore !== null && item.time === null)
    ) {
      throw new BackupValidationError("备份包含没有具体时间却启用了提醒的待办。");
    }
    return {
      checksumSha256: actualChecksum,
      exportedAt: backup.manifest.exportedAt,
      entityCounts: counts,
      totalEntities: Object.values(counts).reduce((total, count) => total + count, 0),
      warnings: ["恢复会整体替换当前业务数据。", "密码、登录状态、AI 密钥和封面文件不在此备份中。"],
    };
  }

  restore(userId: string, backup: BackupDocument, expectedChecksumSha256: string): void {
    const preflight = this.preflight(backup);
    if (preflight.checksumSha256 !== expectedChecksumSha256) {
      throw new BackupValidationError("恢复文件与预检时的文件不一致，请重新预检。");
    }
    this.writeRecoverySnapshot(this.export(userId));
    this.db.transaction((tx) => {
      tx.delete(habitLogs).where(eq(habitLogs.userId, userId)).run();
      tx.delete(habits).where(eq(habits.userId, userId)).run();
      tx.delete(fitnessLogs).where(eq(fitnessLogs.userId, userId)).run();
      tx.delete(fitnessProfiles).where(eq(fitnessProfiles.userId, userId)).run();
      tx.delete(todos).where(eq(todos.userId, userId)).run();
      tx.delete(todoLists).where(eq(todoLists.userId, userId)).run();
      tx.delete(shoppingItems).where(eq(shoppingItems.userId, userId)).run();
      tx.delete(mediaItems).where(eq(mediaItems.userId, userId)).run();
      tx.delete(financeEntries).where(eq(financeEntries.userId, userId)).run();
      tx.delete(monthlyBudgets).where(eq(monthlyBudgets.userId, userId)).run();
      tx.delete(appSettings).where(eq(appSettings.userId, userId)).run();

      if (backup.data.settings) {
        tx.insert(appSettings)
          .values({ ...backup.data.settings, userId })
          .run();
      }
      for (const item of backup.data.financeEntries)
        tx.insert(financeEntries)
          .values({ ...item, userId })
          .run();
      for (const item of backup.data.monthlyBudgets)
        tx.insert(monthlyBudgets)
          .values({ ...item, userId })
          .run();
      for (const item of backup.data.habits)
        tx.insert(habits)
          .values({ ...item, userId })
          .run();
      for (const item of backup.data.habitLogs)
        tx.insert(habitLogs)
          .values({ ...item, userId })
          .run();
      for (const item of backup.data.fitnessProfiles)
        tx.insert(fitnessProfiles)
          .values({ ...item, userId, singletonKey: "default" })
          .run();
      for (const item of backup.data.fitnessLogs)
        tx.insert(fitnessLogs)
          .values({ ...item, userId })
          .run();
      for (const item of backup.data.todoLists)
        tx.insert(todoLists)
          .values({ ...item, userId })
          .run();
      for (const item of backup.data.todos)
        tx.insert(todos)
          .values({ ...item, userId })
          .run();
      for (const item of backup.data.shoppingItems)
        tx.insert(shoppingItems)
          .values({ ...item, userId })
          .run();
      for (const item of backup.data.mediaItems)
        tx.insert(mediaItems)
          .values({ ...item, userId, coverAssetId: null })
          .run();
    });
  }

  private writeRecoverySnapshot(backup: BackupDocument): void {
    if (!this.backupDirectory) return;
    fs.mkdirSync(this.backupDirectory, { recursive: true });
    const timestamp = backup.manifest.exportedAt.replaceAll(":", "-").replaceAll(".", "-");
    const destination = path.join(this.backupDirectory, `pre-restore-${timestamp}.json`);
    fs.writeFileSync(destination, JSON.stringify(backup, null, 2), {
      encoding: "utf8",
      flag: "wx",
    });
  }
}
