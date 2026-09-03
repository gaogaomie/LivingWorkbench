import { type TimelineSource, timelineSourceSchema } from "@daily-life/shared";

export type TimelinePeriod = "month" | "year" | "custom";

export interface TimelineFilters {
  period: TimelinePeriod;
  month: string;
  year: string;
  range: [string, string] | null;
  source: TimelineSource | "all";
  keyword: string;
}

const periodValues = new Set<TimelinePeriod>(["month", "year", "custom"]);

function isLocalDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isYearMonth(value: string | null): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

function daysInMonth(month: string): number {
  const [yearPart, monthPart] = month.split("-");
  return new Date(Date.UTC(Number(yearPart), Number(monthPart), 0)).getUTCDate();
}

export function readTimelineFilters(
  searchParams: URLSearchParams,
  defaultMonth: string,
): TimelineFilters {
  const periodValue = searchParams.get("period") as TimelinePeriod | null;
  const period = periodValue && periodValues.has(periodValue) ? periodValue : "month";
  const monthValue = searchParams.get("month");
  const month = isYearMonth(monthValue) ? monthValue : defaultMonth;
  const yearValue = searchParams.get("year");
  const year = yearValue && /^\d{4}$/.test(yearValue) ? yearValue : month.slice(0, 4);
  const sourceValue = timelineSourceSchema.safeParse(searchParams.get("source"));
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const range: [string, string] | null =
    isLocalDate(from) && isLocalDate(to) && from <= to ? [from, to] : null;

  return {
    period,
    month,
    year,
    range,
    source: sourceValue.success ? sourceValue.data : "all",
    keyword: (searchParams.get("q") ?? "").trim().slice(0, 50),
  };
}

export function timelineDateRange(filters: TimelineFilters): [string, string] {
  if (filters.period === "year") return [`${filters.year}-01-01`, `${filters.year}-12-31`];
  if (filters.period === "custom" && filters.range) return filters.range;
  return [`${filters.month}-01`, `${filters.month}-${daysInMonth(filters.month)}`];
}

export function shiftTimelineMonth(month: string, offset: number): string {
  const [yearPart, monthPart] = month.split("-");
  return new Date(Date.UTC(Number(yearPart), Number(monthPart) - 1 + offset, 1))
    .toISOString()
    .slice(0, 7);
}
