import type { TimelineItem, TimelineResponse } from "@daily-life/shared";
import { expect, type Route, test } from "@playwright/test";

const csrfToken = "test-token-00000000000000000000000000000000";

function sourceCounts(items: TimelineItem[]): TimelineResponse["summary"]["sourceCounts"] {
  const counts: TimelineResponse["summary"]["sourceCounts"] = {
    finance: 0,
    habit: 0,
    fitness: 0,
    schedule: 0,
    shopping: 0,
    media: 0,
  };
  for (const item of items) counts[item.source] += 1;
  return counts;
}

async function fulfill(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, message: "success", data }),
  });
}

test("时光档案支持关键词、周期导航、日期折叠和回顾链接", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => undefined },
    });
  });
  const records: TimelineItem[] = [
    {
      id: "habit:1",
      source: "habit",
      date: "2026-09-03",
      title: "喝水",
      summary: "完成 · 8",
      to: "/habits",
      createdAt: "2026-09-03T10:00:00.000Z",
    },
    {
      id: "media:1",
      source: "media",
      date: "2026-09-02",
      title: "海边的卡夫卡",
      summary: "已完成 · 5 分",
      to: "/media",
      createdAt: "2026-09-02T10:00:00.000Z",
    },
  ];
  const requestedQueries: URLSearchParams[] = [];

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api/v1", "");
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
        checkedAt: "2026-09-03T00:00:00.000Z",
      });
    }
    if (path === "/schedule/reminders/due") return fulfill(route, { items: [] });
    if (path === "/timeline") {
      requestedQueries.push(new URLSearchParams(url.searchParams));
      const keyword = url.searchParams.get("keyword");
      const items = keyword
        ? records.filter((item) => `${item.title} ${item.summary}`.includes(keyword))
        : records;
      return fulfill(route, {
        items,
        nextCursor: null,
        summary: {
          totalRecords: items.length,
          activeDays: new Set(items.map((item) => item.date)).size,
          sourceCounts: sourceCounts(items),
        },
      } satisfies TimelineResponse);
    }
    return fulfill(route, {});
  });

  await page.goto("/timeline?period=month&month=2026-09");
  await expect(page.getByText("留下 2 条记录，点亮 2 天")).toBeVisible();
  await expect(page.getByText("喝水")).toBeVisible();
  const reviewRegion = page.getByRole("region", { name: "生活回顾" });
  const filterRegion = page.getByRole("region", { name: "档案筛选" });
  await expect(reviewRegion).toBeVisible();
  await expect(filterRegion).toBeVisible();
  expect(
    await reviewRegion.evaluate(
      (review, filter) =>
        Boolean(review.compareDocumentPosition(filter) & Node.DOCUMENT_POSITION_FOLLOWING),
      await filterRegion.elementHandle(),
    ),
  ).toBe(true);

  const olderDay = page.getByRole("button", { name: /2026年9月2日/ });
  await expect(olderDay).toHaveAttribute("aria-expanded", "false");
  await page.mouse.wheel(0, 320);
  await expect(olderDay).toBeInViewport();
  await olderDay.click();
  await expect(olderDay).toHaveAttribute("aria-expanded", "true");

  await page.getByLabel("搜索档案关键词").fill("喝水");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page).toHaveURL(/q=%E5%96%9D%E6%B0%B4/);
  await expect(page.getByText("留下 1 条记录，点亮 1 天")).toBeVisible();
  expect(requestedQueries.at(-1)?.get("keyword")).toBe("喝水");

  await page.getByRole("button", { name: "按年" }).click();
  await expect(page).toHaveURL(/period=year/);
  await expect.poll(() => requestedQueries.at(-1)?.get("from")).toBe("2026-01-01");
  await expect.poll(() => requestedQueries.at(-1)?.get("to")).toBe("2026-12-31");

  await page.getByRole("button", { name: "复制回顾链接" }).click();
  await expect(page.getByRole("button", { name: "链接已复制" })).toBeVisible();
});
