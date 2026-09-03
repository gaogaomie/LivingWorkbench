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
await authService.createMemberAccount("islander", "member-password-123");

const app = await buildApp({
  logger: false,
  config: testServerConfig,
  database,
});

interface LoginSession {
  cookie: string;
  csrfToken: string;
}

const sessionsByUsername = new Map<string, LoginSession>();

async function login(username: string, password: string): Promise<LoginSession> {
  const existing = sessionsByUsername.get(username);
  if (existing) {
    return existing;
  }
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: testServerConfig.appOrigin },
    payload: { username, password },
  });
  const setCookie = response.headers["set-cookie"];
  const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(";", 1)[0] ?? "";
  const session = { cookie, csrfToken: response.json().data.csrfToken };
  sessionsByUsername.set(username, session);
  return session;
}

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("admin user routes", () => {
  it("allows an administrator to list accounts without exposing password data", async () => {
    const session = await login("owner", "correct-horse-battery-staple");
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/admin/users",
      headers: { cookie: session.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      code: 200,
      message: "success",
      data: {
        items: [
          { username: "owner", role: "admin" },
          { username: "islander", role: "member" },
        ],
      },
    });
    expect(response.body).not.toContain("password");
  });

  it("creates a member account that can log in with isolated settings", async () => {
    const session = await login("owner", "correct-horse-battery-staple");
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/admin/users",
      headers: {
        cookie: session.cookie,
        origin: testServerConfig.appOrigin,
        "x-csrf-token": session.csrfToken,
      },
      payload: { username: "NewMember", password: "new-member-password" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      code: 200,
      message: "success",
      data: { username: "newmember", role: "member" },
    });

    const memberLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin: testServerConfig.appOrigin },
      payload: { username: "newmember", password: "new-member-password" },
    });
    expect(memberLogin.statusCode).toBe(200);
    expect(memberLogin.json()).toMatchObject({ data: { user: { role: "member" } } });
  });

  it("rejects duplicate usernames as a conflict", async () => {
    const session = await login("owner", "correct-horse-battery-staple");
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/admin/users",
      headers: {
        cookie: session.cookie,
        origin: testServerConfig.appOrigin,
        "x-csrf-token": session.csrfToken,
      },
      payload: { username: "ISLANDER", password: "another-password-123" },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      code: "CONFLICT",
      message: "这个用户名已经被使用。",
    });
  });

  it("rejects member access even with a valid session and csrf token", async () => {
    const session = await login("islander", "member-password-123");
    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/admin/users",
      headers: { cookie: session.cookie },
    });
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/admin/users",
      headers: {
        cookie: session.cookie,
        origin: testServerConfig.appOrigin,
        "x-csrf-token": session.csrfToken,
      },
      payload: { username: "forbidden", password: "forbidden-password" },
    });

    expect(listResponse.statusCode).toBe(403);
    expect(createResponse.statusCode).toBe(403);
    expect(createResponse.json()).toMatchObject({ code: "FORBIDDEN" });
  });

  it("validates account input before hashing or persistence", async () => {
    const session = await login("owner", "correct-horse-battery-staple");
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/admin/users",
      headers: {
        cookie: session.cookie,
        origin: testServerConfig.appOrigin,
        "x-csrf-token": session.csrfToken,
      },
      payload: { username: "x", password: "short" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
