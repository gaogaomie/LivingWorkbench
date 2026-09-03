import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app";
import { createDatabase } from "../../db/client";
import { migrateDatabase } from "../../db/migrate";
import { AuthService } from "../../services/auth.service";
import { testServerConfig } from "../../test/config";

const database = createDatabase(":memory:");
migrateDatabase(database);
const authService = new AuthService(database.db, testServerConfig.sessionTtlDays);
await authService.initializeAdmin("finance-owner", "correct-horse-battery-staple");
const app = await buildApp({ logger: false, config: testServerConfig, database });

let cookie = "";
let csrfToken = "";

beforeAll(async () => {
  await app.ready();
  const login = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: testServerConfig.appOrigin },
    payload: { username: "finance-owner", password: "correct-horse-battery-staple" },
  });
  cookie =
    (Array.isArray(login.headers["set-cookie"])
      ? login.headers["set-cookie"][0]
      : login.headers["set-cookie"]
    )?.split(";", 1)[0] ?? "";
  csrfToken = login.json().data.csrfToken;
});

afterAll(async () => {
  await app.close();
});

describe("finance routes", () => {
  const entry = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    type: "expense",
    amountFen: 2680,
    categoryId: "food",
    date: "2026-09-02",
    note: "晚餐",
  };

  it("requires authentication", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/finance?month=2026-09" });
    expect(response.statusCode).toBe(401);
  });

  it("creates an idempotent entry and calculates the monthly summary", async () => {
    const headers = {
      cookie,
      origin: testServerConfig.appOrigin,
      "x-csrf-token": csrfToken,
    };
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/finance/entries",
      headers,
      payload: entry,
    });
    expect(created.statusCode).toBe(201);

    const replayed = await app.inject({
      method: "POST",
      url: "/api/v1/finance/entries",
      headers,
      payload: entry,
    });
    expect(replayed.statusCode).toBe(200);
    expect(replayed.json().data.idempotentReplay).toBe(true);

    const budget = await app.inject({
      method: "PUT",
      url: "/api/v1/finance/budget",
      headers,
      payload: { month: "2026-09", amountFen: 100_000 },
    });
    expect(budget.statusCode).toBe(200);

    const month = await app.inject({
      method: "GET",
      url: "/api/v1/finance?month=2026-09",
      headers: { cookie },
    });
    expect(month.statusCode).toBe(200);
    expect(month.json()).toMatchObject({
      data: {
        entries: [{ amountFen: 2680, note: "晚餐" }],
        summary: {
          expenseFen: 2680,
          incomeFen: 0,
          balanceFen: -2680,
          budgetFen: 100_000,
          budgetRemainingFen: 97_320,
        },
      },
    });
  });

  it("uses optimistic concurrency and soft deletion", async () => {
    const headers = {
      cookie,
      origin: testServerConfig.appOrigin,
      "x-csrf-token": csrfToken,
    };
    const month = await app.inject({
      method: "GET",
      url: "/api/v1/finance?month=2026-09",
      headers: { cookie },
    });
    const current = month.json().data.entries[0];
    const staleUpdate = await app.inject({
      method: "PATCH",
      url: `/api/v1/finance/entries/${entry.id}`,
      headers,
      payload: {
        ...entry,
        id: undefined,
        amountFen: 3000,
        expectedUpdatedAt: new Date(0).toISOString(),
      },
    });
    expect(staleUpdate.statusCode).toBe(409);

    const deleted = await app.inject({
      method: "DELETE",
      url: `/api/v1/finance/entries/${entry.id}`,
      headers,
      payload: { expectedUpdatedAt: current.updatedAt },
    });
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json()).toEqual({ code: 200, message: "success", data: null });

    const afterDelete = await app.inject({
      method: "GET",
      url: "/api/v1/finance?month=2026-09",
      headers: { cookie },
    });
    expect(afterDelete.json().data.entries).toHaveLength(0);
  });
});
