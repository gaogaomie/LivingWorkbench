import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "./health.schema";

describe("healthResponseSchema", () => {
  it("accepts the stable server health contract", () => {
    const result = healthResponseSchema.safeParse({
      status: "ok",
      service: "daily-life-server",
      version: "0.1.0",
      checkedAt: "2026-09-02T08:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });
});
