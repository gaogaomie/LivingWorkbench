import { describe, expect, it } from "vitest";
import {
  createHabitSchema,
  createShoppingItemSchema,
  fitnessLogInputSchema,
  localDateSchema,
} from "./life.schema";

describe("life module schemas", () => {
  it("rejects impossible dates", () => {
    expect(localDateSchema.safeParse("2026-02-30").success).toBe(false);
  });

  it("accepts a scheduled count habit", () => {
    expect(
      createHabitSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "喝水",
        targetType: "count",
        targetValue: 8,
        unit: "杯",
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        startDate: "2026-09-02",
        colorKey: "app-teal",
      }).success,
    ).toBe(true);
  });

  it("requires at least one fitness value", () => {
    expect(
      fitnessLogInputSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        date: "2026-09-02",
        weightGram: null,
        bodyFatBasisPoints: null,
        calorieIntakeKcal: null,
        exerciseMinutes: null,
        steps: null,
        note: null,
      }).success,
    ).toBe(false);
  });

  it("rejects zero shopping quantity", () => {
    expect(
      createShoppingItemSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "牛奶",
        quantity: 0,
        categoryId: "food",
        estimatedUnitPriceFen: null,
        priority: "soon",
      }).success,
    ).toBe(false);
  });
});
