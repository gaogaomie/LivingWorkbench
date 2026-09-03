import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiSummaryProvider } from "../../ai/ai-summary.provider";
import { buildApp } from "../../app";
import { createDatabase } from "../../db/client";
import { migrateDatabase } from "../../db/migrate";
import { AuthService } from "../../services/auth.service";
import { testServerConfig } from "../../test/config";

const database = createDatabase(":memory:");
migrateDatabase(database);
const authService = new AuthService(database.db, 30);
await authService.initializeAdmin("ai-owner", "correct-horse-battery-staple");

const generate = vi.fn<AiSummaryProvider["generate"]>();
const provider: AiSummaryProvider = { kind: "deepseek", generate };
const app = await buildApp({
  logger: false,
  config: testServerConfig,
  database,
  aiSummaryProvider: provider,
});

let cookie = "";
let csrfToken = "";
const headers = () => ({
  cookie,
  origin: testServerConfig.appOrigin,
  "x-csrf-token": csrfToken,
});

beforeAll(async () => {
  vi.setSystemTime("2026-09-03T09:00:00.000Z");
  await app.ready();
  const login = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: testServerConfig.appOrigin },
    payload: { username: "ai-owner", password: "correct-horse-battery-staple" },
  });
  cookie =
    (Array.isArray(login.headers["set-cookie"])
      ? login.headers["set-cookie"][0]
      : login.headers["set-cookie"]
    )?.split(";", 1)[0] ?? "";
  csrfToken = login.json().data.csrfToken;
});

beforeEach(() => {
  generate.mockReset();
  generate.mockResolvedValue({
    model: "test-model",
    interpretation: {
      headline: "今天的节奏很清晰",
      summary: "你留下了几条可以追溯的生活记录，整体节奏稳定。",
      affirmation: "你已经把注意力放在真实发生的小事上。",
      attention: null,
      nextStep: "睡前再补充一句今天最想保留的感受。",
    },
  });
});

afterAll(async () => {
  await app.close();
  vi.useRealTimers();
});

describe("AI summary routes", () => {
  it("requires an authenticated mutation request and explicit data consent", async () => {
    const unauthenticated = await app.inject({
      method: "POST",
      url: "/api/v1/ai/summaries",
      payload: {
        period: "today",
        date: "2026-09-03",
        style: "gentle",
        consentToSendRecords: true,
      },
    });
    expect(unauthenticated.statusCode).toBe(401);

    const missingConsent = await app.inject({
      method: "POST",
      url: "/api/v1/ai/summaries",
      headers: headers(),
      payload: {
        period: "today",
        date: "2026-09-03",
        style: "gentle",
        consentToSendRecords: false,
      },
    });
    expect(missingConsent.statusCode).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });

  it("uses the configured provider and returns traceable structured output", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/ai/summaries",
      headers: headers(),
      payload: {
        period: "today",
        date: "2026-09-03",
        style: "gentle",
        consentToSendRecords: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(Object.keys(response.json()).sort()).toEqual(["code", "data", "message"]);
    expect(response.json().data).toMatchObject({
      provider: "deepseek",
      model: "test-model",
      period: "today",
      style: "gentle",
      headline: "今天的节奏很清晰",
      fallbackReason: null,
    });
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot: expect.objectContaining({
          period: "today",
          from: "2026-09-03",
          to: "2026-09-03",
        }),
        style: "gentle",
        safetyIdentifier: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });

  it("falls back to deterministic rules when the provider is unavailable", async () => {
    generate.mockRejectedValueOnce(new Error("provider unavailable"));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/ai/summaries",
      headers: headers(),
      payload: {
        period: "week",
        date: "2026-09-03",
        style: "data",
        consentToSendRecords: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      provider: "rules",
      model: null,
      period: "week",
      fallbackReason: "AI 服务暂时不可用，已使用本地规则生成摘要。",
    });
  });
});
