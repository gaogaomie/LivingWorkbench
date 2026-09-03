import type { ShoppingItem } from "@daily-life/shared";
import { describe, expect, it } from "vitest";
import { summarizeWantedBudget } from "./shopping-statistics";

function item(values: Partial<ShoppingItem>): ShoppingItem {
  return {
    id: crypto.randomUUID(),
    name: "测试物品",
    quantity: 1,
    unit: "件",
    categoryId: "daily",
    estimatedUnitPriceFen: 1_000,
    priority: "someday",
    note: null,
    status: "wanted",
    actualUnitPriceFen: null,
    purchasedOn: null,
    createdAt: "2026-09-03T00:00:00.000Z",
    updatedAt: "2026-09-03T00:00:00.000Z",
    ...values,
  };
}

describe("summarizeWantedBudget", () => {
  it("只按待买且已填写价格的物品汇总分类预算", () => {
    const result = summarizeWantedBudget([
      item({ categoryId: "food", quantity: 2, estimatedUnitPriceFen: 1_500 }),
      item({ categoryId: "food", estimatedUnitPriceFen: 500 }),
      item({ categoryId: "digital", status: "purchased", estimatedUnitPriceFen: 9_000 }),
      item({ categoryId: "home", estimatedUnitPriceFen: null }),
    ]);

    expect(result).toEqual([{ categoryId: "food", amountFen: 3_500 }]);
  });
});
