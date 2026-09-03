import { z } from "zod";

export const financeEntryTypeSchema = z.enum(["expense", "income"]);

export const financeCategorySchema = z.enum([
  "food",
  "transport",
  "shopping",
  "housing",
  "health",
  "entertainment",
  "education",
  "salary",
  "bonus",
  "investment",
  "other",
]);

export const financeCategoryLabels: Record<z.infer<typeof financeCategorySchema>, string> = {
  food: "餐饮",
  transport: "交通",
  shopping: "购物",
  housing: "居住",
  health: "健康",
  entertainment: "娱乐",
  education: "学习",
  salary: "工资",
  bonus: "奖金",
  investment: "投资",
  other: "其他",
};

export const financeCategoriesByType = {
  expense: [
    "food",
    "transport",
    "shopping",
    "housing",
    "health",
    "entertainment",
    "education",
    "other",
  ],
  income: ["salary", "bonus", "investment", "other"],
} as const satisfies Record<z.infer<typeof financeEntryTypeSchema>, readonly string[]>;

const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "请输入有效日期");
export const yearMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "月份格式应为 YYYY-MM");
const amountFenSchema = z.number().int().positive().max(999_999_999_999);

const financeEntryInputShape = {
  type: financeEntryTypeSchema,
  amountFen: amountFenSchema,
  categoryId: financeCategorySchema,
  date: localDateSchema,
  note: z.string().trim().max(200).nullable().optional(),
};

function validateCategory(
  value: {
    type: z.infer<typeof financeEntryTypeSchema>;
    categoryId: z.infer<typeof financeCategorySchema>;
  },
  context: z.RefinementCtx,
) {
  if (!(financeCategoriesByType[value.type] as readonly string[]).includes(value.categoryId)) {
    context.addIssue({
      code: "custom",
      path: ["categoryId"],
      message: "分类与收支类型不匹配",
    });
  }
}

export const createFinanceEntrySchema = z
  .object({ id: z.string().uuid(), ...financeEntryInputShape })
  .superRefine(validateCategory);

export const updateFinanceEntrySchema = z
  .object({ ...financeEntryInputShape, expectedUpdatedAt: z.iso.datetime() })
  .superRefine(validateCategory);

export const deleteFinanceEntrySchema = z.object({ expectedUpdatedAt: z.iso.datetime() });

export const financeEntrySchema = createFinanceEntrySchema.safeExtend({
  note: z.string().nullable(),
  month: yearMonthSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const financeCategorySummarySchema = z.object({
  categoryId: financeCategorySchema,
  amountFen: z.number().int().nonnegative(),
});

export const financeMonthSummarySchema = z.object({
  month: yearMonthSchema,
  incomeFen: z.number().int().nonnegative(),
  expenseFen: z.number().int().nonnegative(),
  balanceFen: z.number().int(),
  budgetFen: z.number().int().nonnegative().nullable(),
  budgetRemainingFen: z.number().int().nullable(),
  categoryBreakdown: z.array(financeCategorySummarySchema),
});

export const financeMonthResponseSchema = z.object({
  entries: z.array(financeEntrySchema),
  summary: financeMonthSummarySchema,
});

export const setMonthlyBudgetSchema = z.object({
  month: yearMonthSchema,
  amountFen: z.number().int().nonnegative().max(999_999_999_999),
});

export type FinanceEntryType = z.infer<typeof financeEntryTypeSchema>;
export type FinanceCategory = z.infer<typeof financeCategorySchema>;
export type CreateFinanceEntry = z.infer<typeof createFinanceEntrySchema>;
export type UpdateFinanceEntry = z.infer<typeof updateFinanceEntrySchema>;
export type DeleteFinanceEntry = z.infer<typeof deleteFinanceEntrySchema>;
export type FinanceEntry = z.infer<typeof financeEntrySchema>;
export type FinanceMonthSummary = z.infer<typeof financeMonthSummarySchema>;
export type FinanceMonthResponse = z.infer<typeof financeMonthResponseSchema>;
export type SetMonthlyBudget = z.infer<typeof setMonthlyBudgetSchema>;
