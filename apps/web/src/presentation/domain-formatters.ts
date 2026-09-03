const moneyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function parseDateParts(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  if (!year || !month || !day) return null;
  return { year: Number(year), month: Number(month), day: Number(day) };
}

export function formatMoneyFen(amountFen: number): string {
  return moneyFormatter.format(amountFen / 100);
}

export function formatWeightGram(weightGram: number): string {
  return `${(weightGram / 1000).toFixed(1)} kg`;
}

export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

export function formatLocalDate(value: string): string {
  const parts = parseDateParts(value);
  return parts ? `${parts.year}年${parts.month}月${parts.day}日` : value;
}

export function formatMonth(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month] = match;
  return year && month ? `${year}年${Number(month)}月` : value;
}

export function formatMonthDay(value: string): string {
  const parts = parseDateParts(value);
  return parts ? `${parts.month}月${parts.day}日` : value;
}

export function formatIsoDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}
