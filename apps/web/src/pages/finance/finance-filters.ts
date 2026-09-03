import {
  type FinanceCategory,
  type FinanceEntry,
  type FinanceEntryType,
  financeCategoriesByType,
  financeCategorySchema,
  financeEntryTypeSchema,
  yearMonthSchema,
} from "@daily-life/shared";

export type FinanceTypeFilter = FinanceEntryType | "all";
export type FinanceCategoryFilter = FinanceCategory | "all";

export interface FinanceFilters {
  month: string;
  type: FinanceTypeFilter;
  category: FinanceCategoryFilter;
  range: [string, string] | null;
}

function isLocalDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function readFinanceFilters(
  searchParams: URLSearchParams,
  defaultMonth: string,
): FinanceFilters {
  const monthValue = searchParams.get("month");
  const typeValue = financeEntryTypeSchema.safeParse(searchParams.get("type"));
  const categoryValue = financeCategorySchema.safeParse(searchParams.get("category"));
  const month = yearMonthSchema.safeParse(monthValue).success
    ? (monthValue ?? defaultMonth)
    : defaultMonth;
  const type = typeValue.success ? typeValue.data : "all";
  const category =
    categoryValue.success &&
    (type === "all" || financeCategoriesByType[type].some((item) => item === categoryValue.data))
      ? categoryValue.data
      : "all";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const range: [string, string] | null =
    isLocalDate(from) &&
    isLocalDate(to) &&
    from.startsWith(month) &&
    to.startsWith(month) &&
    from <= to
      ? [from, to]
      : null;

  return {
    month,
    type,
    category,
    range,
  };
}

export function previousMonth(month: string): string {
  const [yearPart, monthPart] = month.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 2;
  return new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 7);
}

export function filterFinanceEntries(
  entries: readonly FinanceEntry[],
  filters: FinanceFilters,
): FinanceEntry[] {
  return entries.filter((entry) => {
    if (filters.type !== "all" && entry.type !== filters.type) return false;
    if (filters.category !== "all" && entry.categoryId !== filters.category) return false;
    if (filters.range && (entry.date < filters.range[0] || entry.date > filters.range[1])) {
      return false;
    }
    return true;
  });
}
