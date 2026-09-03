import { describe, expect, it } from "vitest";
import { readTimelineFilters, shiftTimelineMonth, timelineDateRange } from "./timeline-filters";

describe("timeline filters", () => {
  it("restores a monthly archive query and calculates the complete month range", () => {
    const filters = readTimelineFilters(
      new URLSearchParams("period=month&month=2024-02&source=habit&q=%20%E5%96%9D%E6%B0%B4%20"),
      "2026-09",
    );

    expect(filters).toMatchObject({
      period: "month",
      month: "2024-02",
      source: "habit",
      keyword: "喝水",
    });
    expect(timelineDateRange(filters)).toEqual(["2024-02-01", "2024-02-29"]);
  });

  it("supports yearly and valid custom ranges while rejecting invalid URL values", () => {
    const yearly = readTimelineFilters(new URLSearchParams("period=year&year=2025"), "2026-09");
    const invalid = readTimelineFilters(
      new URLSearchParams("period=custom&from=2026-09-20&to=2026-09-01&source=unknown"),
      "2026-09",
    );

    expect(timelineDateRange(yearly)).toEqual(["2025-01-01", "2025-12-31"]);
    expect(invalid).toMatchObject({ range: null, source: "all" });
    expect(timelineDateRange(invalid)).toEqual(["2026-09-01", "2026-09-30"]);
    expect(shiftTimelineMonth("2026-01", -1)).toBe("2025-12");
  });
});
