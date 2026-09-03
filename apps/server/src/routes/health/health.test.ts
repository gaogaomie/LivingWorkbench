import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app";
import { testServerConfig } from "../../test/config";

const app = await buildApp({ logger: false, config: testServerConfig });

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("health routes", () => {
  it("reports that the process is live", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health/live",
    });

    expect(response.statusCode).toBe(200);
    expect(Object.keys(response.json()).sort()).toEqual(["code", "data", "message"]);
    expect(response.json()).toMatchObject({
      code: 200,
      message: "success",
      data: {
        status: "ok",
        service: "daily-life-server",
      },
    });
  });

  it("uses the same envelope for a non-2xx response", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/missing" });
    expect(response.statusCode).toBe(404);
    expect(Object.keys(response.json()).sort()).toEqual(["code", "data", "message"]);
    expect(response.json()).toMatchObject({
      code: "NOT_FOUND",
      message: "请求的接口不存在。",
      data: { requestId: expect.any(String) },
    });
  });
});
