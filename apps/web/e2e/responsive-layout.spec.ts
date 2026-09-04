import type { HabitDayResponse } from "@daily-life/shared";
import { expect, type Page, type Route, test } from "@playwright/test";

const timestamp = "2026-09-03T10:00:00.000Z";

async function fulfill(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, message: "success", data }),
  });
}

async function mockApplicationShell(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");

    if (path === "/auth/session") {
      return fulfill(route, {
        user: { id: "00000000-0000-4000-8000-000000000001", username: "owner" },
        csrfToken: "test-token-00000000000000000000000000000000",
        expiresAt: "2099-01-01T00:00:00.000Z",
      });
    }
    if (path === "/health/ready") {
      return fulfill(route, {
        status: "ok",
        service: "daily-life-server",
        version: "test",
        checkedAt: timestamp,
      });
    }
    if (path === "/schedule/reminders/due") return fulfill(route, { items: [] });
    if (path === "/overview") {
      return fulfill(route, {
        date: url.searchParams.get("date"),
        finance: { expenseFen: 12_800, entryCount: 3 },
        habits: { planned: 4, completed: 2 },
        schedule: { today: 2, overdue: 0 },
        recent: [],
      });
    }
    if (path === "/habits") return fulfill(route, createHabitsResponse());
    return fulfill(route, {});
  });
}

function createHabitsResponse(): HabitDayResponse {
  const items: HabitDayResponse["items"] = [
    {
      id: "00000000-0000-4000-8000-000000000010",
      name: "晨间深度阅读与知识整理",
      targetType: "duration",
      targetValue: 30,
      unit: "分钟",
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startDate: "2026-09-01",
      colorKey: "app-teal",
      status: "active",
      value: 20,
      completed: false,
      streak: 12,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
  const history = Array.from({ length: 30 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    planned: 1,
    completed: index % 3 === 0 ? 1 : 0,
    rate: index % 3 === 0 ? 1 : 0,
  }));

  return {
    date: "2026-09-03",
    items,
    history,
    summary: { planned: 1, completed: 0, bestStreak: 12, completionRate30: 0.34 },
  };
}

test("1920px 宽屏下主要内容充分利用可用空间", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await mockApplicationShell(page);
  await page.goto("/");

  const widths = await page.locator("#main-content").evaluate((main) => {
    const section = main.querySelector(":scope > div > section");
    if (!(section instanceof HTMLElement)) throw new Error("未找到页面主内容");
    return {
      available: main.getBoundingClientRect().width,
      content: section.getBoundingClientRect().width,
    };
  });

  expect(widths.content / widths.available).toBeGreaterThanOrEqual(0.9);
});

test("桌面侧栏使用指定品牌 logo 且图片成功加载", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockApplicationShell(page);
  await page.goto("/");

  const logo = page.getByRole("link", { name: "回到今日总览", exact: true }).locator("img");
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute(
    "src",
    "/brand/logo/exec-b9fa8384-df56-4039-aec2-66189c06b8d8.png",
  );
  await expect(logo).toHaveJSProperty("naturalWidth", 1254);
});

test("登录页使用指定品牌 logo 且小屏没有横向溢出", async ({ page }) => {
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ code: 401, message: "请先登录", data: null }),
    }),
  );
  await page.goto("/login");

  const logo = page.locator('section[aria-labelledby="login-title"] > img');
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute(
    "src",
    "/brand/logo/exec-b9fa8384-df56-4039-aec2-66189c06b8d8.png",
  );
  await expect(logo).toHaveJSProperty("naturalWidth", 1254);
  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
});

test("习惯页在中等与标准桌面视口均没有横向溢出", async ({ page }) => {
  await mockApplicationShell(page);

  for (const width of [768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/habits");
    await expect(page.getByRole("heading", { name: "晨间深度阅读与知识整理" })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  }
});
