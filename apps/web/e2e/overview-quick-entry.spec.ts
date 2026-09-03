import {
  createFinanceEntrySchema,
  createShoppingItemSchema,
  createTodoSchema,
  fitnessLogInputSchema,
  type TimelineItem,
} from "@daily-life/shared";
import { expect, type Route, test } from "@playwright/test";

const csrfToken = "test-token-00000000000000000000000000000000";
const timestamp = "2026-09-03T10:00:00.000Z";

async function fulfill(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, message: "success", data }),
  });
}

test("首页四个快捷入口在抽屉中保存并局部刷新总览", async ({ page }) => {
  let financeExpenseFen = 0;
  let financeEntryCount = 0;
  let scheduleToday = 0;
  const recent: TimelineItem[] = [];

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = request.method();

    if (path === "/auth/session") {
      return fulfill(route, {
        user: { id: "00000000-0000-4000-8000-000000000001", username: "owner" },
        csrfToken,
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
        finance: { expenseFen: financeExpenseFen, entryCount: financeEntryCount },
        habits: { planned: 0, completed: 0 },
        schedule: { today: scheduleToday, overdue: 0 },
        recent,
      });
    }
    if (path === "/schedule" && method === "GET") {
      return fulfill(route, {
        lists: [],
        items: [],
        summary: { today: scheduleToday, overdue: 0, next7Days: scheduleToday, completed: 0 },
      });
    }
    if (path === "/finance/entries" && method === "POST") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      const input = createFinanceEntrySchema.parse(request.postDataJSON());
      financeExpenseFen += input.type === "expense" ? input.amountFen : 0;
      financeEntryCount += 1;
      recent.unshift({
        id: input.id,
        source: "finance",
        date: input.date,
        title: input.note ?? "财务记录",
        summary: `支出 ¥${(input.amountFen / 100).toFixed(2)}`,
        to: "/finance",
        createdAt: timestamp,
      });
      return fulfill(route, { entry: input, idempotentReplay: false });
    }
    if (path === "/schedule/todos" && method === "POST") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      const input = createTodoSchema.parse(request.postDataJSON());
      scheduleToday += 1;
      recent.unshift({
        id: input.id,
        source: "schedule",
        date: input.date,
        title: input.title,
        summary: "待办 · 普通",
        to: "/schedule",
        createdAt: timestamp,
      });
      return fulfill(route, { id: input.id });
    }
    if (path === "/fitness/logs" && method === "POST") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      const input = fitnessLogInputSchema.parse(request.postDataJSON());
      recent.unshift({
        id: input.id,
        source: "fitness",
        date: input.date,
        title: "体重 65.5 kg",
        summary: "体重 65.5 kg",
        to: "/fitness",
        createdAt: timestamp,
      });
      return fulfill(route, { id: input.id });
    }
    if (path === "/shopping/items" && method === "POST") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      const input = createShoppingItemSchema.parse(request.postDataJSON());
      recent.unshift({
        id: input.id,
        source: "shopping",
        date: url.searchParams.get("date") ?? "2026-09-03",
        title: input.name,
        summary: `待买 · ${input.quantity}${input.unit ?? "件"}`,
        to: "/shopping",
        createdAt: timestamp,
      });
      return fulfill(route, { id: input.id });
    }
    return fulfill(route, {});
  });

  await page.goto("/");

  await page.getByRole("button", { name: "记一笔", exact: true }).click();
  await page.getByLabel("金额（元）").fill("28.50");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "还有内容没有保存" })).toBeVisible();
  await page.getByRole("button", { name: "继续填写" }).click();
  await expect(page.getByLabel("金额（元）")).toHaveValue("28.50");
  await page.getByLabel("备注").fill("首页午餐");
  await page.getByRole("button", { name: "保存这笔记录" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("¥28.50", { exact: true })).toBeVisible();
  await expect(page.getByText("首页午餐", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "排日程", exact: true }).click();
  await page.getByLabel("事项", { exact: true }).fill("首页安排复盘");
  await page
    .getByRole("dialog", { name: "加入日程" })
    .getByRole("button", { name: "加入日程", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("首页安排复盘", { exact: true })).toBeVisible();
  await expect(page.getByText("1", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "记体重", exact: true }).click();
  await page.getByLabel("体重（kg）").fill("65.5");
  await page.getByRole("button", { name: "保存今日记录" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("体重 65.5 kg", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "待买物品", exact: true }).click();
  await page.getByLabel("物品名称").fill("首页收纳盒");
  await page.getByRole("button", { name: "加入待买清单" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("首页收纳盒", { exact: true })).toBeVisible();
});
