import { describe, expect, it } from "vitest";
import { createApiFailure, createApiSuccess, isApiResponse } from "./api.contract";

describe("API response contract", () => {
  it("creates an exact success envelope", () => {
    const response = createApiSuccess({ id: "record-id" });
    expect(response).toEqual({ code: 200, message: "success", data: { id: "record-id" } });
    expect(Object.keys(response).sort()).toEqual(["code", "data", "message"]);
  });

  it("creates an exact failure envelope with explicit null data", () => {
    const response = createApiFailure("NOT_FOUND", "没有找到对应记录。");
    expect(response).toEqual({ code: "NOT_FOUND", message: "没有找到对应记录。", data: null });
    expect(isApiResponse(response)).toBe(true);
  });

  it("rejects legacy and extended top-level structures", () => {
    expect(isApiResponse({ data: {} })).toBe(false);
    expect(isApiResponse({ code: 200, message: "success", data: {}, success: true })).toBe(false);
    expect(isApiResponse({ error: { code: "NOT_FOUND" } })).toBe(false);
    expect(isApiResponse({ code: 200, message: "success", data: "raw value" })).toBe(false);
  });
});
