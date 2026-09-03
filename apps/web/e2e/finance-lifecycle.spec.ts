import {
  createFinanceEntrySchema,
  type FinanceEntry,
  type TimelineItem,
  updateFinanceEntrySchema,
} from "@daily-life/shared";
import { expect, type Route, test } from "@playwright/test";

const csrfToken = "test-token-00000000000000000000000000000000";
const timestamp = "2026-09-03T10:00:00.000Z";
const editedTimestamp = "2026-09-03T10:05:00.000Z";

async function fulfill(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({ code: status === 200 ? 200 : "TEST_ERROR", message: "success", data }),
  });
}

test("财务记录在总览和时光档案同步，并可删除后恢复", async ({ page }) => {
  await page.clock.setFixedTime(new Date(timestamp));
  let entry: FinanceEntry | null = null;
  let deletedAt: string | null = null;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = request.method();
    const activeEntry = deletedAt === null ? entry : null;
    const timelineItem: TimelineItem | null = activeEntry
      ? {
          id: activeEntry.id,
          source: "finance",
          date: activeEntry.date,
          title: activeEntry.note ?? "餐饮支出",
          summary: `支出 ¥${(activeEntry.amountFen / 100).toFixed(2)}`,
          to: "/finance",
          createdAt: activeEntry.createdAt,
        }
      : null;

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
    if (path === "/finance" && method === "GET") {
      const requestedMonth = url.searchParams.get("month") ?? "2026-09";
      const monthEntry = activeEntry?.month === requestedMonth ? activeEntry : null;
      const entries = monthEntry ? [monthEntry] : [];
      const expenseFen = requestedMonth === "2026-08" ? 1_000 : (monthEntry?.amountFen ?? 0);
      return fulfill(route, {
        entries,
        summary: {
          month: requestedMonth,
          incomeFen: 0,
          expenseFen,
          balanceFen: -expenseFen,
          budgetFen: null,
          budgetRemainingFen: null,
          categoryBreakdown: monthEntry
            ? [{ categoryId: monthEntry.categoryId, amountFen: monthEntry.amountFen }]
            : [],
        },
      });
    }
    if (path === "/finance/entries" && method === "POST") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      const input = createFinanceEntrySchema.parse(request.postDataJSON());
      entry = {
        ...input,
        note: input.note ?? null,
        month: input.date.slice(0, 7),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      return fulfill(route, { entry, idempotentReplay: false });
    }
    if (path.startsWith("/finance/entries/") && method === "PATCH") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      const input = updateFinanceEntrySchema.parse(request.postDataJSON());
      expect(input.expectedUpdatedAt).toBe(timestamp);
      if (!entry) throw new Error("编辑前必须存在账目");
      const values = {
        type: input.type,
        amountFen: input.amountFen,
        categoryId: input.categoryId,
        date: input.date,
        note: input.note,
      };
      entry = {
        ...entry,
        ...values,
        month: values.date.slice(0, 7),
        note: values.note ?? null,
        updatedAt: editedTimestamp,
      };
      return fulfill(route, entry);
    }
    if (path === "/overview") {
      return fulfill(route, {
        date: url.searchParams.get("date") ?? "2026-09-03",
        finance: {
          expenseFen: activeEntry?.amountFen ?? 0,
          entryCount: activeEntry ? 1 : 0,
        },
        habits: { planned: 0, completed: 0 },
        schedule: { today: 0, overdue: 0 },
        recent: timelineItem ? [timelineItem] : [],
      });
    }
    if (path === "/timeline") {
      return fulfill(route, {
        items: timelineItem ? [timelineItem] : [],
        nextCursor: null,
        summary: {
          totalRecords: timelineItem ? 1 : 0,
          activeDays: timelineItem ? 1 : 0,
          sourceCounts: {
            finance: timelineItem ? 1 : 0,
            habit: 0,
            fitness: 0,
            schedule: 0,
            shopping: 0,
            media: 0,
          },
        },
      });
    }
    if (path === "/trash" && method === "GET") {
      return fulfill(route, {
        items:
          entry && deletedAt
            ? [
                {
                  id: entry.id,
                  source: "finance",
                  label: entry.note ?? "餐饮支出",
                  deletedAt,
                  updatedAt: entry.updatedAt,
                },
              ]
            : [],
      });
    }
    if (path.startsWith("/trash/finance/") && path.endsWith("/restore")) {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      deletedAt = null;
      return fulfill(route, { restored: true });
    }
    if (path.startsWith("/trash/finance/") && method === "DELETE") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      deletedAt = "2026-09-03T10:05:00.000Z";
      return fulfill(route, null);
    }

    return fulfill(route, {});
  });

  await page.goto("/finance");
  await page.getByRole("button", { name: "设置预算", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "设置本月预算" })).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "记一笔", exact: true }).click();
  await page.getByLabel("金额（元）").fill("28.50");
  await page.getByLabel("备注").fill("闭环午餐");
  await expect(page.getByLabel("金额（元）")).toHaveValue("28.50");
  await expect(page.getByLabel("备注")).toHaveValue("闭环午餐");
  const entryCreated = page.waitForResponse((response) => {
    const request = response.request();
    return (
      request.method() === "POST" &&
      new URL(response.url()).pathname.endsWith("/api/v1/finance/entries")
    );
  });
  const financeRefreshed = page.waitForResponse((response) => {
    const request = response.request();
    return (
      request.method() === "GET" && new URL(response.url()).pathname.endsWith("/api/v1/finance")
    );
  });
  await page.getByRole("button", { name: "保存这笔记录" }).click();
  await entryCreated;
  await financeRefreshed;
  const ledgerTable = page.getByRole("table");
  await expect(ledgerTable.getByRole("columnheader", { name: "日期" })).toBeVisible();
  await expect(ledgerTable.getByRole("columnheader", { name: "分类" })).toBeVisible();
  await expect(ledgerTable.getByRole("columnheader", { name: "备注" })).toBeVisible();
  await expect(ledgerTable.getByRole("columnheader", { name: "金额" })).toBeVisible();
  await expect(ledgerTable.getByRole("columnheader", { name: "操作" })).toBeVisible();
  await expect(page.getByText("闭环午餐")).toBeVisible();
  await expect(page.getByText("+¥18.50")).toBeVisible();

  const editEntryButton = page.getByRole("button", { name: "编辑“闭环午餐”", exact: true });
  await editEntryButton.press("Enter");
  await expect(page.getByRole("radio", { name: "支出" })).toBeChecked();
  await expect(page.getByLabel("金额（元）")).toHaveValue("28.50");
  await expect(page.getByRole("combobox", { name: "分类", exact: true })).toContainText("餐饮");
  await expect(page.getByRole("combobox", { name: "日期", exact: true })).toContainText(
    "2026-09-03",
  );
  await expect(page.getByLabel(/^备注/)).toHaveValue("闭环午餐");
  await page.getByLabel("金额（元）").fill("30.00");
  await page.getByRole("button", { name: "保存账目修改" }).click();
  await expect(page.getByLabel("通知", { exact: true }).getByText("账目已更新。")).toBeVisible();
  await expect(page.getByText("+¥20.00")).toBeVisible();

  await page.getByRole("combobox", { name: "筛选收支类型" }).click();
  await page.getByRole("option", { name: "仅收入" }).click();
  await expect(page).toHaveURL(/type=income/);
  await expect(page.getByText("当前筛选条件下没有账目。")).toBeVisible();
  await expect(page.getByText("闭环午餐")).not.toBeVisible();

  await page.goto(
    "/finance?month=2026-09&type=expense&category=food&from=2026-09-01&to=2026-09-30",
  );
  await expect(page.getByText("闭环午餐")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出当前结果" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("财务明细-2026-09.csv");

  await page.goto("/");
  await expect(page.getByText("¥30.00", { exact: true })).toBeVisible();

  await page.goto("/timeline");
  await expect(page.getByText("闭环午餐")).toBeVisible();

  await page.goto("/finance");
  await page.getByRole("button", { name: "删除“闭环午餐”" }).press("Enter");
  await expect(page.getByText("移到回收站？")).toBeVisible();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByText("这个月还没有记录。")).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByText("闭环午餐")).toBeVisible();
  await page.getByRole("button", { name: "恢复“闭环午餐”" }).click();
  await expect(page.getByText("回收站是空的。")).toBeVisible();

  await page.goto("/finance");
  await expect(page.getByText("闭环午餐")).toBeVisible();
});
