import { z } from "zod";

export const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "请输入有效日期");

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
const entityResponseShape = {
  id: z.string().uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
};

export const habitTargetTypeSchema = z.enum(["boolean", "count", "duration"]);
export const habitStatusSchema = z.enum(["active", "paused", "archived"]);
export const createHabitSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(40),
  targetType: habitTargetTypeSchema,
  targetValue: z.number().int().positive().max(100_000),
  unit: z.string().trim().min(1).max(12),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1),
  startDate: localDateSchema,
  colorKey: z.string().trim().min(1).max(30),
});
export const updateHabitSchema = createHabitSchema.omit({ id: true }).extend({
  expectedUpdatedAt: z.iso.datetime(),
});
export const recordHabitProgressSchema = z.object({
  date: localDateSchema,
  value: z.number().int().nonnegative().max(1_000_000),
});
export const updateHabitStatusSchema = z.object({ status: habitStatusSchema });
export const habitDayItemSchema = createHabitSchema.extend({
  ...entityResponseShape,
  status: habitStatusSchema,
  value: z.number().int().nonnegative(),
  completed: z.boolean(),
  streak: z.number().int().nonnegative(),
});
export const habitDayResponseSchema = z.object({
  date: localDateSchema,
  items: z.array(habitDayItemSchema),
  history: z.array(
    z.object({
      date: localDateSchema,
      planned: z.number().int().nonnegative(),
      completed: z.number().int().nonnegative(),
      rate: z.number().min(0).max(1),
    }),
  ),
  summary: z.object({
    planned: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    bestStreak: z.number().int().nonnegative(),
    completionRate30: z.number().min(0).max(1),
  }),
});

export const fitnessProfileInputSchema = z.object({
  heightCm: z.number().int().min(80).max(250).nullable(),
  birthYear: z.number().int().min(1900).max(2200).nullable(),
  sexForFormula: z.enum(["female", "male"]).nullable(),
  startWeightGram: z.number().int().min(20_000).max(500_000).nullable(),
  targetWeightGram: z.number().int().min(20_000).max(500_000).nullable(),
  targetDate: localDateSchema.nullable(),
});
export const fitnessProfileSchema = fitnessProfileInputSchema.extend(entityResponseShape);
const fitnessLogValueShape = {
  date: localDateSchema,
  weightGram: z.number().int().min(20_000).max(500_000).nullable(),
  bodyFatBasisPoints: z.number().int().min(100).max(8_000).nullable(),
  calorieIntakeKcal: z.number().int().min(0).max(20_000).nullable(),
  exerciseMinutes: z.number().int().min(0).max(1_440).nullable(),
  steps: z.number().int().min(0).max(200_000).nullable(),
  note: nullableText(200),
};
const hasFitnessValue = (value: {
  weightGram: number | null;
  bodyFatBasisPoints: number | null;
  calorieIntakeKcal: number | null;
  exerciseMinutes: number | null;
  steps: number | null;
  note?: string | null | undefined;
}) =>
  value.weightGram !== null ||
  value.bodyFatBasisPoints !== null ||
  value.calorieIntakeKcal !== null ||
  value.exerciseMinutes !== null ||
  value.steps !== null ||
  Boolean(value.note);
export const fitnessLogInputSchema = z
  .object({
    id: z.string().uuid(),
    ...fitnessLogValueShape,
  })
  .refine(hasFitnessValue, "请至少填写一项记录");
export const fitnessLogSchema = fitnessLogInputSchema.safeExtend({
  ...entityResponseShape,
  note: z.string().nullable(),
});
export const updateFitnessLogSchema = z
  .object({ ...fitnessLogValueShape, expectedUpdatedAt: z.iso.datetime() })
  .refine(hasFitnessValue, "请至少填写一项记录");
export const fitnessResponseSchema = z.object({
  profile: fitnessProfileSchema.nullable(),
  logs: z.array(fitnessLogSchema),
  summary: z.object({
    currentWeightGram: z.number().int().nullable(),
    distanceToTargetGram: z.number().int().nullable(),
    bmi: z.number().nullable(),
    averageWeight7Gram: z.number().int().nullable(),
    goalProgress: z.number().min(0).max(1).nullable(),
  }),
});

export const todoPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export const todoStatusSchema = z.enum(["pending", "completed", "cancelled"]);
export const reminderMinutesBeforeSchema = z.union([
  z.literal(0),
  z.literal(10),
  z.literal(30),
  z.literal(60),
  z.literal(1_440),
]);
const todoInputShape = {
  title: z.string().trim().min(1).max(100),
  date: localDateSchema,
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable(),
  listId: z.string().uuid().nullable(),
  priority: todoPrioritySchema,
  note: nullableText(300),
  reminderMinutesBefore: reminderMinutesBeforeSchema.nullable(),
};
function validateTodoReminder(
  value: { time: string | null; reminderMinutesBefore: number | null },
  context: z.RefinementCtx,
) {
  if (value.reminderMinutesBefore !== null && value.time === null) {
    context.addIssue({
      code: "custom",
      path: ["reminderMinutesBefore"],
      message: "设置提醒前请先选择具体时间",
    });
  }
}
export const createTodoSchema = z
  .object({ id: z.string().uuid(), ...todoInputShape })
  .superRefine(validateTodoReminder);
export const updateTodoSchema = z
  .object({ ...todoInputShape, expectedUpdatedAt: z.iso.datetime() })
  .superRefine(validateTodoReminder);
export const updateTodoStatusSchema = z.object({ status: todoStatusSchema });
export const todoListSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  colorKey: z.string(),
});
export const todoItemSchema = z.object({
  ...todoInputShape,
  ...entityResponseShape,
  note: z.string().nullable(),
  status: todoStatusSchema,
  completedAt: z.iso.datetime().nullable(),
  isOverdue: z.boolean(),
});
export const scheduleResponseSchema = z.object({
  lists: z.array(todoListSchema),
  items: z.array(todoItemSchema),
  summary: z.object({
    today: z.number().int().nonnegative(),
    overdue: z.number().int().nonnegative(),
    next7Days: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
  }),
});
export const localDateTimeMinuteSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/)
  .refine((value) => {
    const parsed = new Date(`${value}:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 16) === value;
  }, "请输入有效的本地日期时间");
export const dueReminderQuerySchema = z
  .object({ from: localDateTimeMinuteSchema, to: localDateTimeMinuteSchema })
  .refine((value) => value.from <= value.to, "提醒查询开始时间不能晚于结束时间");
export const dueReminderSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  date: localDateSchema,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  remindAt: localDateTimeMinuteSchema,
  reminderMinutesBefore: reminderMinutesBeforeSchema,
});
export const dueRemindersResponseSchema = z.object({ items: z.array(dueReminderSchema) });

export const shoppingStatusSchema = z.enum(["wanted", "purchased"]);
export const shoppingPrioritySchema = z.enum(["casual", "someday", "soon", "urgent"]);
export const shoppingCategorySchema = z.enum([
  "food",
  "daily",
  "clothing",
  "digital",
  "home",
  "gift",
  "other",
]);
export const createShoppingItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  quantity: z.number().int().positive().max(99_999),
  unit: nullableText(12),
  categoryId: shoppingCategorySchema,
  estimatedUnitPriceFen: z.number().int().nonnegative().max(999_999_999_999).nullable(),
  priority: shoppingPrioritySchema,
  note: nullableText(300),
});
export const updateShoppingItemSchema = createShoppingItemSchema.omit({ id: true }).extend({
  expectedUpdatedAt: z.iso.datetime(),
});
export const purchaseShoppingItemSchema = z.object({
  status: shoppingStatusSchema,
  actualUnitPriceFen: z.number().int().nonnegative().max(999_999_999_999).nullable(),
  purchasedOn: localDateSchema.nullable(),
});
export const shoppingItemSchema = createShoppingItemSchema.extend({
  ...entityResponseShape,
  unit: z.string().nullable(),
  note: z.string().nullable(),
  status: shoppingStatusSchema,
  actualUnitPriceFen: z.number().int().nullable(),
  purchasedOn: localDateSchema.nullable(),
});
export const shoppingResponseSchema = z.object({
  items: z.array(shoppingItemSchema),
  summary: z.object({
    wantedCount: z.number().int().nonnegative(),
    estimatedBudgetFen: z.number().int().nonnegative(),
    purchasedThisMonth: z.number().int().nonnegative(),
  }),
});

export const mediaTypeSchema = z.enum([
  "book",
  "movie",
  "series",
  "show",
  "anime",
  "podcast",
  "other",
]);
export const mediaStatusSchema = z.enum(["wishlist", "in_progress", "completed", "paused"]);
export const createMediaItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  type: mediaTypeSchema,
  status: mediaStatusSchema,
  rating: z.number().int().min(1).max(5).nullable(),
  recordedOn: localDateSchema,
  completedOn: localDateSchema.nullable(),
  review: nullableText(300),
});
export const updateMediaItemSchema = z.object({
  status: mediaStatusSchema,
  rating: z.number().int().min(1).max(5).nullable(),
  completedOn: localDateSchema.nullable(),
});
export const editMediaItemSchema = createMediaItemSchema.omit({ id: true }).extend({
  expectedUpdatedAt: z.iso.datetime(),
});
export const mediaItemSchema = createMediaItemSchema.extend({
  ...entityResponseShape,
  review: z.string().nullable(),
  coverAssetId: z.string().uuid().nullable(),
});
export const mediaResponseSchema = z.object({
  items: z.array(mediaItemSchema),
  summary: z.object({
    completedThisYear: z.number().int().nonnegative(),
    averageRating: z.number().nullable(),
    favoriteType: mediaTypeSchema.nullable(),
    ratingDistribution: z.record(z.string(), z.number().int().nonnegative()),
  }),
});

export const timelineSourceSchema = z.enum([
  "finance",
  "habit",
  "fitness",
  "schedule",
  "shopping",
  "media",
]);
export const timelineItemSchema = z.object({
  id: z.string(),
  source: timelineSourceSchema,
  date: localDateSchema,
  title: z.string(),
  summary: z.string(),
  to: z.string().startsWith("/"),
  createdAt: z.iso.datetime(),
});
export const timelineResponseSchema = z.object({
  items: z.array(timelineItemSchema),
  nextCursor: z.string().nullable(),
  summary: z.object({
    totalRecords: z.number().int().nonnegative(),
    activeDays: z.number().int().nonnegative(),
    sourceCounts: z.object({
      finance: z.number().int().nonnegative(),
      habit: z.number().int().nonnegative(),
      fitness: z.number().int().nonnegative(),
      schedule: z.number().int().nonnegative(),
      shopping: z.number().int().nonnegative(),
      media: z.number().int().nonnegative(),
    }),
  }),
});
export const overviewResponseSchema = z.object({
  date: localDateSchema,
  finance: z.object({
    expenseFen: z.number().int().nonnegative(),
    entryCount: z.number().int().nonnegative(),
  }),
  habits: z.object({
    planned: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
  }),
  schedule: z.object({
    today: z.number().int().nonnegative(),
    overdue: z.number().int().nonnegative(),
  }),
  recent: z.array(timelineItemSchema).max(3),
});

export const trashSourceSchema = z.enum([
  "finance",
  "habit",
  "fitness",
  "schedule",
  "shopping",
  "media",
]);
export const deleteRecordSchema = z.object({ expectedUpdatedAt: z.iso.datetime() });
export const restoreRecordSchema = z.object({ expectedDeletedAt: z.iso.datetime() });
export const trashItemSchema = z.object({
  id: z.string().uuid(),
  source: trashSourceSchema,
  label: z.string(),
  deletedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const trashResponseSchema = z.object({ items: z.array(trashItemSchema) });

export type CreateHabit = z.infer<typeof createHabitSchema>;
export type UpdateHabit = z.infer<typeof updateHabitSchema>;
export type HabitDayItem = z.infer<typeof habitDayItemSchema>;
export type HabitDayResponse = z.infer<typeof habitDayResponseSchema>;
export type FitnessProfileInput = z.infer<typeof fitnessProfileInputSchema>;
export type FitnessLogInput = z.infer<typeof fitnessLogInputSchema>;
export type UpdateFitnessLog = z.infer<typeof updateFitnessLogSchema>;
export type FitnessResponse = z.infer<typeof fitnessResponseSchema>;
export type CreateTodo = z.infer<typeof createTodoSchema>;
export type UpdateTodo = z.infer<typeof updateTodoSchema>;
export type TodoStatus = z.infer<typeof todoStatusSchema>;
export type ScheduleResponse = z.infer<typeof scheduleResponseSchema>;
export type DueRemindersResponse = z.infer<typeof dueRemindersResponseSchema>;
export type CreateShoppingItem = z.infer<typeof createShoppingItemSchema>;
export type UpdateShoppingItem = z.infer<typeof updateShoppingItemSchema>;
export type ShoppingItem = z.infer<typeof shoppingItemSchema>;
export type ShoppingResponse = z.infer<typeof shoppingResponseSchema>;
export type CreateMediaItem = z.infer<typeof createMediaItemSchema>;
export type EditMediaItem = z.infer<typeof editMediaItemSchema>;
export type MediaItem = z.infer<typeof mediaItemSchema>;
export type MediaResponse = z.infer<typeof mediaResponseSchema>;
export type TimelineSource = z.infer<typeof timelineSourceSchema>;
export type TimelineItem = z.infer<typeof timelineItemSchema>;
export type TimelineResponse = z.infer<typeof timelineResponseSchema>;
export type OverviewResponse = z.infer<typeof overviewResponseSchema>;
export type TrashSource = z.infer<typeof trashSourceSchema>;
export type TrashItem = z.infer<typeof trashItemSchema>;
export type TrashResponse = z.infer<typeof trashResponseSchema>;
