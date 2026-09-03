import { describe, expect, it } from "vitest";
import { createFinanceEntrySchema, setMonthlyBudgetSchema } from "./finance.schema";

describe("finance schemas", () => {
  it("accepts positive integer fen values", () => {
    const result = createFinanceEntrySchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      type: "expense",
      amountFen: 1280,
      categoryId: "food",
      date: "2026-09-02",
      note: "午餐",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a category that does not belong to the entry type", () => {
    const result = createFinanceEntrySchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      type: "expense",
      amountFen: 1280,
      categoryId: "salary",
      date: "2026-09-02",
    });

    expect(result.success).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    const result = createFinanceEntrySchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      type: "expense",
      amountFen: 1280,
      categoryId: "food",
      date: "2026-02-30",
    });

    expect(result.success).toBe(false);
  });

  it("allows a zero monthly budget to mean no spending allowance", () => {
    expect(setMonthlyBudgetSchema.safeParse({ month: "2026-09", amountFen: 0 }).success).toBe(true);
  });
});
