import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createLocalServer, hasDesktopToken } from "./local-server";

const directories: string[] = [];
const servers: Awaited<ReturnType<typeof createLocalServer>>[] = [];
const token = "a".repeat(64);
const headers = { "x-daily-life-desktop": token };
const settings = {
  sessionSecret: "s".repeat(64),
  deepSeekApiKey: null,
  deepSeekModel: "test-model",
};
async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), "daily-desktop-"));
  directories.push(directory);
  const webRoot = path.join(directory, "web");
  await mkdir(webRoot);
  await writeFile(path.join(webRoot, "index.html"), "<!doctype html><title>日常集</title>");
  const input = { directory, webRoot, token, settings };
  const instance = await createLocalServer(input);
  servers.push(instance);
  return { ...instance, input };
}
afterEach(async () => {
  for (const instance of servers.splice(0)) await instance.server.close();
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});

describe("desktop local server", () => {
  it("rejects local requests without the private desktop token", async () => {
    const { server } = await fixture();
    for (const value of [undefined, "bad-token", "b".repeat(64)]) {
      const response = await server.inject({
        url: "/api/v1/health/ready",
        headers: value ? { "x-daily-life-desktop": value } : {},
      });
      expect(response.statusCode).toBe(403);
      expect(Object.keys(response.json()).sort()).toEqual(["code", "data", "message"]);
    }
    expect(hasDesktopToken([token], token)).toBe(false);
  });
  it("serves the bundled app for nested routes while preserving API 404 envelopes", async () => {
    const { server } = await fixture();
    const page = await server.inject({ url: "/finance", headers });
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain("日常集");
    const missing = await server.inject({ url: "/api/v1/missing", headers });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().code).toBe("NOT_FOUND");
  });
  it("creates the first account once and preserves it after reopening the database", async () => {
    const instance = await fixture();
    expect(instance.needsSetup()).toBe(true);
    await instance.setup({ username: "owner", password: "test-password-123" });
    expect(instance.needsSetup()).toBe(false);
    await expect(
      instance.setup({ username: "other", password: "test-password-123" }),
    ).rejects.toThrow();
    await instance.server.close();
    const reopened = await createLocalServer(instance.input);
    servers.push(reopened);
    expect(reopened.needsSetup()).toBe(false);
    const login = await reopened.server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers,
      payload: { username: "owner", password: "test-password-123" },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().data.user.username).toBe("owner");
    const denied = await reopened.server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { ...headers, origin: "https://untrusted.example" },
      payload: { username: "owner", password: "test-password-123" },
    });
    expect(denied.statusCode).toBe(403);
  });
});
