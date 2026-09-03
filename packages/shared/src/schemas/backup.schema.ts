import { z } from "zod";
import { financeCategorySchema, financeEntryTypeSchema, yearMonthSchema } from "./finance.schema";
import {
  habitStatusSchema,
  habitTargetTypeSchema,
  localDateSchema,
  mediaStatusSchema,
  mediaTypeSchema,
  reminderMinutesBeforeSchema,
  shoppingCategorySchema,
  shoppingPrioritySchema,
  shoppingStatusSchema,
  todoPrioritySchema,
  todoStatusSchema,
} from "./life.schema";

const backupEntityShape = {
  id: z.string().uuid(),
  isDemo: z.boolean(),
  schemaVersion: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
};

const financeEntryBackupSchema = z.object({
  ...backupEntityShape,
  type: financeEntryTypeSchema,
  amountFen: z.number().int().positive(),
  categoryId: financeCategorySchema,
  date: localDateSchema,
  month: yearMonthSchema,
  note: z.string().nullable(),
});

const monthlyBudgetBackupSchema = z.object({
  ...backupEntityShape,
  month: yearMonthSchema,
  amountFen: z.number().int().nonnegative(),
});

const habitBackupSchema = z.object({
  ...backupEntityShape,
  name: z.string().min(1),
  targetType: habitTargetTypeSchema,
  targetValue: z.number().int().positive(),
  unit: z.string().min(1),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1),
  startDate: localDateSchema,
  colorKey: z.string().min(1),
  status: habitStatusSchema,
  sortOrder: z.number().int(),
});

const habitLogBackupSchema = z.object({
  ...backupEntityShape,
  habitId: z.string().uuid(),
  date: localDateSchema,
  value: z.number().int().nonnegative(),
  completed: z.boolean(),
});

const fitnessProfileBackupSchema = z.object({
  ...backupEntityShape,
  heightCm: z.number().int().min(80).max(250).nullable(),
  birthYear: z.number().int().min(1900).max(2200).nullable(),
  sexForFormula: z.enum(["female", "male"]).nullable(),
  startWeightGram: z.number().int().min(20_000).max(500_000).nullable(),
  targetWeightGram: z.number().int().min(20_000).max(500_000).nullable(),
  targetDate: localDateSchema.nullable(),
});

const fitnessLogBackupSchema = z.object({
  ...backupEntityShape,
  date: localDateSchema,
  weightGram: z.number().int().min(20_000).max(500_000).nullable(),
  bodyFatBasisPoints: z.number().int().min(100).max(8_000).nullable(),
  calorieIntakeKcal: z.number().int().min(0).max(20_000).nullable(),
  exerciseMinutes: z.number().int().min(0).max(1_440).nullable(),
  steps: z.number().int().min(0).max(200_000).nullable(),
  note: z.string().nullable(),
});

const todoListBackupSchema = z.object({
  ...backupEntityShape,
  name: z.string().min(1),
  colorKey: z.string().min(1),
  sortOrder: z.number().int(),
});

const todoBackupSchema = z.object({
  ...backupEntityShape,
  title: z.string().min(1),
  date: localDateSchema,
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable(),
  listId: z.string().uuid().nullable(),
  priority: todoPrioritySchema,
  note: z.string().nullable(),
  reminderMinutesBefore: reminderMinutesBeforeSchema.nullable(),
  status: todoStatusSchema,
  completedAt: z.iso.datetime().nullable(),
});

const shoppingItemBackupSchema = z.object({
  ...backupEntityShape,
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unit: z.string().nullable(),
  categoryId: shoppingCategorySchema,
  estimatedUnitPriceFen: z.number().int().nonnegative().nullable(),
  actualUnitPriceFen: z.number().int().nonnegative().nullable(),
  priority: shoppingPrioritySchema,
  note: z.string().nullable(),
  status: shoppingStatusSchema,
  purchasedOn: localDateSchema.nullable(),
});

const mediaItemBackupSchema = z.object({
  ...backupEntityShape,
  name: z.string().min(1),
  type: mediaTypeSchema,
  status: mediaStatusSchema,
  rating: z.number().int().min(1).max(5).nullable(),
  recordedOn: localDateSchema,
  completedOn: localDateSchema.nullable(),
  review: z.string().nullable(),
  coverAssetId: z.string().nullable(),
});

const settingsBackupSchema = z.object({
  locale: z.string(),
  timezone: z.string(),
  currency: z.string(),
  weightUnit: z.string(),
  theme: z.string(),
  updatedAt: z.iso.datetime(),
});

export const backupDataSchema = z.object({
  settings: settingsBackupSchema.nullable(),
  financeEntries: z.array(financeEntryBackupSchema),
  monthlyBudgets: z.array(monthlyBudgetBackupSchema),
  habits: z.array(habitBackupSchema),
  habitLogs: z.array(habitLogBackupSchema),
  fitnessProfiles: z.array(fitnessProfileBackupSchema),
  fitnessLogs: z.array(fitnessLogBackupSchema),
  todoLists: z.array(todoListBackupSchema),
  todos: z.array(todoBackupSchema),
  shoppingItems: z.array(shoppingItemBackupSchema),
  mediaItems: z.array(mediaItemBackupSchema),
});

export const backupManifestSchema = z.object({
  format: z.literal("riji-workbench-excel-backup"),
  formatVersion: z.literal(1),
  appVersion: z.string(),
  schemaVersion: z.literal(1),
  exportedAt: z.iso.datetime(),
  locale: z.string(),
  entityCounts: z.record(z.string(), z.number().int().nonnegative()),
  includesEncryptedSecrets: z.literal(false),
});

export const backupDocumentSchema = z.object({
  manifest: backupManifestSchema,
  data: backupDataSchema,
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export const restorePreflightResponseSchema = z.object({
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
  exportedAt: z.iso.datetime(),
  entityCounts: z.record(z.string(), z.number().int().nonnegative()),
  totalEntities: z.number().int().nonnegative(),
  affectedMediaCoverCount: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
});

export const backupWorkbookUploadSchema = z.object({
  workbookBase64: z
    .string()
    .min(1)
    .max(15 * 1024 * 1024),
});

export const restoreBackupRequestSchema = backupWorkbookUploadSchema.extend({
  expectedChecksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export type BackupData = z.infer<typeof backupDataSchema>;
export type BackupDocument = z.infer<typeof backupDocumentSchema>;
export type RestorePreflightResponse = z.infer<typeof restorePreflightResponseSchema>;
