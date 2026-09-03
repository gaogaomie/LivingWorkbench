import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app";
import { createDatabase } from "../../db/client";
import { migrateDatabase } from "../../db/migrate";
import { AuthService } from "../../services/auth.service";
import { testServerConfig } from "../../test/config";

const database = createDatabase(":memory:");
migrateDatabase(database);
const authService = new AuthService(database.db, testServerConfig.sessionTtlDays);
await authService.initializeAdmin("owner", "correct-horse-battery-staple");

const app = await buildApp({
  logger: false,
  config: testServerConfig,
  database,
});

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("auth routes", () => {
  it("creates a hashed-cookie session and returns an authenticated profile", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin: testServerConfig.appOrigin },
      payload: { username: "owner", password: "correct-horse-battery-staple" },
    });

    expect(login.statusCode).toBe(200);
    const setCookie = login.headers["set-cookie"];
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");

    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const sessionToken = cookieHeader?.split(";", 1)[0]?.split("=", 2)[1] ?? "";
    const session = await app.inject({
      method: "GET",
      url: "/api/v1/auth/session",
      cookies: { daily_life_session: sessionToken },
    });

    expect(session.statusCode).toBe(200);
    const sessionBody = session.json();
    expect(sessionBody).toMatchObject({ data: { user: { username: "owner" } } });

    const logout = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: {
        cookie: `daily_life_session=${sessionToken}`,
        "x-csrf-token": sessionBody.data.csrfToken,
      },
    });
    expect(logout.statusCode).toBe(200);
    expect(logout.json()).toEqual({ code: 200, message: "success", data: null });

    const afterLogout = await app.inject({
      method: "GET",
      url: "/api/v1/auth/session",
      headers: { cookie: `daily_life_session=${sessionToken}` },
    });
    expect(afterLogout.statusCode).toBe(401);
  });

  it("does not reveal whether the username or password was wrong", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin: testServerConfig.appOrigin },
      payload: { username: "owner", password: "definitely-wrong" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      code: "UNAUTHENTICATED",
      message: "用户名或密码不正确。",
      data: { requestId: expect.any(String) },
    });
  });
});
