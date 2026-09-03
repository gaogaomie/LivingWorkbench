import { expect, type Page, type Route, test } from "@playwright/test";

const csrfToken = "test-token-00000000000000000000000000000000";
const admin = {
  id: "00000000-0000-4000-8000-000000000001",
  username: "owner",
  role: "admin",
  createdAt: "2026-09-04T00:00:00.000Z",
} as const;

async function fulfill(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, message: "success", data }),
  });
}

async function mockAuthenticatedApp(page: Page, role: "admin" | "member") {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    if (path === "/auth/session") {
      return fulfill(route, {
        user: { ...admin, role, username: role === "admin" ? "owner" : "islander" },
        csrfToken,
        expiresAt: "2099-01-01T00:00:00.000Z",
      });
    }
    if (path === "/health/ready") {
      return fulfill(route, {
        status: "ok",
        service: "daily-life-server",
        version: "test",
        checkedAt: "2026-09-04T00:00:00.000Z",
      });
    }
    if (path === "/schedule/reminders/due") {
      return fulfill(route, { items: [] });
    }
    return fulfill(route, {});
  });
}

test("管理员创建成员账号后可在账号列表看到结果", async ({ page }) => {
  let createRequest: unknown = null;
  await mockAuthenticatedApp(page, "admin");
  await page.route("**/api/v1/admin/users", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      createRequest = request.postDataJSON();
      return fulfill(
        route,
        {
          id: "00000000-0000-4000-8000-000000000002",
          username: "new_member",
          role: "member",
          createdAt: "2026-09-04T00:10:00.000Z",
        },
        201,
      );
    }
    return fulfill(route, { items: [admin] });
  });

  await page.goto("/settings/accounts");
  await expect(page.getByRole("heading", { name: "账号管理" })).toBeVisible();
  await page.getByLabel("用户名").fill("New_Member");
  await page.getByLabel("初始密码").fill("safe-password-123");
  await page.getByRole("button", { name: "创建成员账号" }).click();

  expect(createRequest).toEqual({ username: "new_member", password: "safe-password-123" });
  await expect(
    page.getByLabel("通知", { exact: true }).getByText("成员账号“new_member”已创建。"),
  ).toBeVisible();
});

test("成员看不到账号管理入口且直接访问会被拦截", async ({ page }) => {
  await mockAuthenticatedApp(page, "member");

  await page.goto("/settings/accounts");

  await expect(page.getByRole("alert")).toContainText("只有管理员可以查看和创建账号");
  await expect(page.getByRole("link", { name: "账号管理" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "创建成员账号" })).toHaveCount(0);
});
