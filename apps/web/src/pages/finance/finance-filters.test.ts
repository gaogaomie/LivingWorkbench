import type { FinanceEntry } from "@daily-life/shared";
import { describe, expect, it } from "vitest";
import { filterFinanceEntries, previousMonth, readFinanceFilters } from "./finance-filters";

const entries: FinanceEntry[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    type: "expense",
    amountFen: 2_850,
    categoryId: "food",
    date: "2026-09-03",
    month: "2026-09",
    note: "午餐",
    createdAt: "2026-09-03T10:00:00.000Z",
    updatedAt: "2026-09-03T10:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    type: "income",
    amountFen: 500_000,
    categoryId: "salary",
    date: "2026-09-10",
    month: "2026-09",
    note: "工资",
    createdAt: "2026-09-10T10:00:00.000Z",
    updatedAt: "2026-09-10T10:00:00.000Z",
  },
];

describe("finance filters", () => {
  it("从 URL 恢复筛选并只返回符合类型、分类和日期范围的账目", () => {
    const filters = readFinanceFilters(
      new URLSearchParams("month=2026-09&type=expense&category=food&from=2026-09-01&to=2026-09-05"),
      "2026-08",
    );

    expect(filters).toEqual({
      month: "2026-09",
      type: "expense",
      category: "food",
      range: ["2026-09-01", "2026-09-05"],
    });
    expect(filterFinanceEntries(entries, filters).map((entry) => entry.note)).toEqual(["午餐"]);
  });

  it("无效筛选回退为默认值并正确跨年计算上月", () => {
    const filters = readFinanceFilters(
      new URLSearchParams("month=bad&type=income&category=food&from=2026-08-01&to=2026-08-10"),
      "2026-09",
    );

    expect(filters).toEqual({ month: "2026-09", type: "income", category: "all", range: null });
    expect(previousMonth("2026-01")).toBe("2025-12");
  });
});
