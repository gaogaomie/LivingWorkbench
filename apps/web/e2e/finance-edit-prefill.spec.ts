import { expect, type Route, test } from "@playwright/test";

const timestamp = "2026-09-03T10:00:00.000Z";

async function fulfill(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, message: "success", data }),
  });
}

test("编辑账目时立即回填现有字段", async ({ page }) => {
  await page.clock.setFixedTime(new Date(timestamp));
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api/v1", "");
    if (path === "/auth/session") {
      return fulfill(route, {
        user: {
          id: "00000000-0000-4000-8000-000000000001",
          username: "owner",
          role: "admin",
        },
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
    if (path === "/schedule/reminders/due") {
      return fulfill(route, { items: [] });
    }
    if (path === "/finance") {
      const isCurrentMonth = url.searchParams.get("month") === "2026-09";
      return fulfill(route, {
        entries: isCurrentMonth
          ? [
              {
                id: "00000000-0000-4000-8000-000000000011",
                type: "expense",
                amountFen: 2_850,
                categoryId: "food",
                date: "2026-09-03",
                month: "2026-09",
                note: "闭环午餐",
                createdAt: timestamp,
                updatedAt: timestamp,
              },
            ]
          : [],
        summary: {
          month: url.searchParams.get("month") ?? "2026-09",
          incomeFen: 0,
          expenseFen: isCurrentMonth ? 2_850 : 0,
          balanceFen: isCurrentMonth ? -2_850 : 0,
          budgetFen: null,
          budgetRemainingFen: null,
          categoryBreakdown: isCurrentMonth ? [{ categoryId: "food", amountFen: 2_850 }] : [],
        },
      });
    }
    return fulfill(route, {});
  });

  await page.goto("/finance");
  await page.getByRole("button", { name: "编辑“闭环午餐”", exact: true }).press("Enter");

  await expect(page.getByRole("radio", { name: "支出" })).toBeChecked();
  await expect(page.getByLabel("金额（元）")).toHaveValue("28.50");
  await expect(page.getByRole("combobox", { name: "分类", exact: true })).toContainText("餐饮");
  await expect(page.getByRole("combobox", { name: "日期", exact: true })).toContainText(
    "2026-09-03",
  );
  await expect(page.getByLabel(/^备注/)).toHaveValue("闭环午餐");
});
