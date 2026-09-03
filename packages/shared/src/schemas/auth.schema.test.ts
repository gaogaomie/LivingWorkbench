import { describe, expect, it } from "vitest";
import { loginRequestSchema } from "./auth.schema";

describe("loginRequestSchema", () => {
  it("normalizes the single-admin username", () => {
    expect(
      loginRequestSchema.parse({ username: "  GaoGao ", password: "long-enough-password" }),
    ).toEqual({ username: "gaogao", password: "long-enough-password" });
  });

  it("rejects a short password", () => {
    expect(loginRequestSchema.safeParse({ username: "gaogao", password: "short" }).success).toBe(
      false,
    );
  });
});
