import {
  createTodoSchema,
  type ScheduleResponse,
  updateTodoStatusSchema,
} from "@daily-life/shared";
import { expect, type Route, test } from "@playwright/test";

const csrfToken = "test-token-00000000000000000000000000000000";
const timestamp = "2026-09-03T10:00:00.000Z";

function localDateAndTime() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

async function fulfill(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, message: "success", data }),
  });
}

test("到期日程创建后立即提醒，完成后刷新提醒状态", async ({ page }) => {
  const current = localDateAndTime();
  let item: ScheduleResponse["items"][number] | null = null;
  let dueQueryCount = 0;
  let emptyDueQueryAfterCompletion = false;
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
  });

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
    if (path === "/schedule" && method === "GET") {
      const completed = item?.status === "completed" ? 1 : 0;
      return fulfill(route, {
        lists: [],
        items: item ? [item] : [],
        summary: {
          today: item && item.status === "pending" ? 1 : 0,
          overdue: 0,
          next7Days: item && item.status === "pending" ? 1 : 0,
          completed,
        },
      });
    }
    if (path === "/schedule/todos" && method === "POST") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      const input = createTodoSchema.parse(request.postDataJSON());
      item = {
        ...input,
        note: input.note ?? null,
        status: "pending",
        completedAt: null,
        isOverdue: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      return fulfill(route, { id: input.id });
    }
    if (path === "/schedule/reminders/due" && method === "GET") {
      dueQueryCount += 1;
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      expect(from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(to).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(new Date(`${to}:00`).getTime() - new Date(`${from}:00`).getTime()).toBe(
        24 * 60 * 60_000,
      );
      const dueItems =
        item?.status === "pending" && item.time && item.reminderMinutesBefore === 0
          ? [
              {
                id: item.id,
                title: item.title,
                date: item.date,
                time: item.time,
                remindAt: `${item.date}T${item.time}`,
                reminderMinutesBefore: 0,
              },
            ]
          : [];
      if (item?.status === "completed" && dueItems.length === 0) {
        emptyDueQueryAfterCompletion = true;
      }
      return fulfill(route, { items: dueItems });
    }
    if (path.startsWith("/schedule/todos/") && path.endsWith("/status") && method === "PATCH") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      const input = updateTodoStatusSchema.parse(request.postDataJSON());
      if (item) {
        item = {
          ...item,
          status: input.status,
          completedAt: input.status === "completed" ? timestamp : null,
          updatedAt: timestamp,
        };
      }
      return fulfill(route, { updated: true });
    }
    return fulfill(route, {});
  });

  await page.goto("/schedule");
  await expect.poll(() => dueQueryCount).toBeGreaterThanOrEqual(1);
  await page.getByRole("button", { name: "加入日程", exact: true }).click();

  await page.getByLabel("事项").fill("P0 到期提醒");
  await page.getByLabel("时间").click();
  await page.getByRole("button", { name: `${Number(current.time.slice(0, 2))} 时` }).click();
  await page
    .getByRole("button", { name: `${Number(current.time.slice(3, 5))} 分`, exact: true })
    .click();
  await page.getByRole("button", { name: "确定", exact: true }).click();
  const reminderSelect = page.getByRole("combobox", { name: "到时提醒" });
  await reminderSelect.click();
  await page.getByRole("option", { name: "到时提醒", exact: true }).click();
  await page
    .getByRole("dialog", { name: "加入日程" })
    .getByRole("button", { name: "加入日程", exact: true })
    .click();

  await expect.poll(() => dueQueryCount).toBeGreaterThanOrEqual(2);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  await expect(
    page.getByRole("region", { name: "通知" }).getByText(`日程提醒：${current.time} P0 到期提醒`),
  ).toBeVisible();
  expect(item?.reminderMinutesBefore).toBe(0);

  await page.getByRole("button", { name: "完成", exact: true }).click();
  await expect(page.getByRole("button", { name: "恢复", exact: true })).toBeVisible();
  await expect.poll(() => dueQueryCount).toBeGreaterThanOrEqual(3);
  expect(emptyDueQueryAfterCompletion).toBe(true);
});
