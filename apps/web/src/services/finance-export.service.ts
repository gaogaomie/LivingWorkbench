import type { FinanceEntry } from "@daily-life/shared";
import { financeCategoryLabels } from "@daily-life/shared";

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildFinanceEntriesCsv(entries: readonly FinanceEntry[]): string {
  const rows = entries.map((entry) =>
    [
      entry.date,
      entry.type === "income" ? "收入" : "支出",
      financeCategoryLabels[entry.categoryId],
      (entry.amountFen / 100).toFixed(2),
      entry.note ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  return [
    `\uFEFF${["日期", "收支类型", "分类", "金额（元）", "备注"].map(csvCell).join(",")}`,
    ...rows,
  ].join("\r\n");
}

export function downloadFinanceEntriesCsv(entries: readonly FinanceEntry[], month: string): void {
  const url = URL.createObjectURL(
    new Blob([buildFinanceEntriesCsv(entries)], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `财务明细-${month}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
