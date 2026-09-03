import { expect, test } from "@playwright/test";

test("登录表单具有可访问名称", async ({ page }) => {
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ code: "UNAUTHENTICATED", message: "未登录", data: null }),
    }),
  );
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  await expect(page.getByRole("button", { name: "回到岛上" })).toBeVisible();
  await expect(page.getByLabel("用户名")).toBeVisible();
  await expect(page.getByLabel("密码")).toHaveAttribute("type", "password");
});

test("移动导航支持展开与 Escape 关闭", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "仅在移动端项目验证菜单交互");
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 200, message: "success", data: {} }),
    }),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 200,
        message: "success",
        data: {
          user: { id: "00000000-0000-4000-8000-000000000001", username: "owner" },
          csrfToken: "test-token-00000000000000000000000000000000",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      }),
    }),
  );
  await page.route("**/api/v1/overview**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 200,
        message: "success",
        data: {
          date: "2026-09-03",
          finance: { expenseFen: 0, entryCount: 0 },
          habits: { planned: 0, completed: 0 },
          schedule: { today: 0, overdue: 0 },
          recent: [],
        },
      }),
    }),
  );
  await page.route("**/api/v1/health/ready", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 200,
        message: "success",
        data: {
          status: "ok",
          service: "daily-life-server",
          version: "test",
          checkedAt: "2026-09-03T00:00:00.000Z",
        },
      }),
    }),
  );
  await page.route("**/api/v1/timeline**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 200,
        message: "success",
        data: {
          items: [],
          nextCursor: null,
          summary: {
            totalRecords: 0,
            activeDays: 0,
            sourceCounts: {
              finance: 0,
              habit: 0,
              fitness: 0,
              schedule: 0,
              shopping: 0,
              media: 0,
            },
          },
        },
      }),
    }),
  );
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "今天，慢慢来" })).toBeVisible();
  const menu = page.getByRole("button", { name: "菜单" });
  await menu.click();
  await expect(page.getByRole("navigation", { name: "移动端导航" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "移动端导航" })).toBeHidden();
  await expect(menu).toBeFocused();
});
