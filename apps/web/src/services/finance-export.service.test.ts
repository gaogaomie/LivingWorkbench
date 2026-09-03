import type { FinanceEntry } from "@daily-life/shared";
import { describe, expect, it } from "vitest";
import { buildFinanceEntriesCsv } from "./finance-export.service";

describe("buildFinanceEntriesCsv", () => {
  it("导出中文标签、精确金额并转义备注", () => {
    const entry: FinanceEntry = {
      id: "00000000-0000-4000-8000-000000000001",
      type: "expense",
      amountFen: 2_850,
      categoryId: "food",
      date: "2026-09-03",
      month: "2026-09",
      note: '午餐, "工作餐"',
      createdAt: "2026-09-03T10:00:00.000Z",
      updatedAt: "2026-09-03T10:00:00.000Z",
    };

    const csv = buildFinanceEntriesCsv([entry]);

    expect(csv).toContain('"支出","餐饮","28.50","午餐, ""工作餐"""');
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).not.toContain("food");
  });
});
