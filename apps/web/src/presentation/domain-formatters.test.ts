import { describe, expect, it } from "vitest";
import {
  formatInteger,
  formatIsoDateTime,
  formatLocalDate,
  formatMoneyFen,
  formatMonth,
  formatMonthDay,
  formatWeightGram,
} from "./domain-formatters";

describe("domain formatters", () => {
  it("uses one Chinese presentation format for money, weight and counts", () => {
    expect(formatMoneyFen(123_456)).toBe("¥1,234.56");
    expect(formatMoneyFen(-850)).toBe("-¥8.50");
    expect(formatWeightGram(68_050)).toBe("68.0 kg");
    expect(formatInteger(12_345)).toBe("12,345");
  });

  it("renders local dates without timezone conversion", () => {
    expect(formatLocalDate("2026-09-03")).toBe("2026年9月3日");
    expect(formatMonth("2026-09")).toBe("2026年9月");
    expect(formatMonthDay("2026-09-03")).toBe("9月3日");
    expect(formatLocalDate("invalid")).toBe("invalid");
    expect(formatIsoDateTime("invalid")).toBe("invalid");
  });
});
