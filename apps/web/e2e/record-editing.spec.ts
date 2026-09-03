import {
  createHabitSchema,
  createShoppingItemSchema,
  type FitnessResponse,
  fitnessLogInputSchema,
  type HabitDayResponse,
  type MediaItem,
  type ScheduleResponse,
  type ShoppingItem,
  updateFitnessLogSchema,
  updateHabitSchema,
  updateShoppingItemSchema,
} from "@daily-life/shared";
import { expect, type Route, test } from "@playwright/test";

const csrfToken = "test-token-00000000000000000000000000000000";
const timestamp = "2026-09-03T10:00:00.000Z";
const editedTimestamp = "2026-09-03T10:05:00.000Z";

async function fulfill(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, message: "success", data }),
  });
}

async function fulfillShellRequest(route: Route, path: string): Promise<boolean> {
  if (path === "/auth/session") {
    await fulfill(route, {
      user: { id: "00000000-0000-4000-8000-000000000001", username: "owner" },
      csrfToken,
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
    return true;
  }
  if (path === "/health/ready") {
    await fulfill(route, {
      status: "ok",
      service: "daily-life-server",
      version: "test",
      checkedAt: timestamp,
    });
    return true;
  }
  if (path === "/schedule/reminders/due") {
    await fulfill(route, { items: [] });
    return true;
  }
  return false;
}

test("习惯创建后可编辑名称并保留并发版本", async ({ page }) => {
  let item: HabitDayResponse["items"][number] | null = null;
  let updateRequest: unknown = null;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    const method = request.method();
    if (await fulfillShellRequest(route, path)) return;

    if (path === "/habits" && method === "GET") {
      return fulfill(route, {
        date: new URL(request.url()).searchParams.get("date"),
        items: item ? [item] : [],
        history: [],
        summary: {
          planned: item ? 1 : 0,
          completed: item?.completed ? 1 : 0,
          bestStreak: item?.streak ?? 0,
          completionRate30: 0,
        },
      });
    }
    if (path === "/habits" && method === "POST") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      const input = createHabitSchema.parse(request.postDataJSON());
      item = {
        ...input,
        status: "active",
        value: 0,
        completed: false,
        streak: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      return fulfill(route, { id: input.id });
    }
    if (path.startsWith("/habits/") && method === "PUT") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      const input = updateHabitSchema.parse(request.postDataJSON());
      updateRequest = input;
      const { expectedUpdatedAt, ...values } = input;
      expect(expectedUpdatedAt).toBe(timestamp);
      if (item) item = { ...item, ...values, updatedAt: editedTimestamp };
      return fulfill(route, { updated: true });
    }
    return fulfill(route, {});
  });

  await page.goto("/habits");
  await page.getByRole("button", { name: "新增习惯", exact: true }).click();
  await page.getByLabel("习惯名称").fill("晨间阅读");
  await page.getByRole("button", { name: "开始这个习惯" }).click();
  await expect(page.getByRole("heading", { name: "晨间阅读" })).toBeVisible();

  await page.getByRole("button", { name: "编辑“晨间阅读”", exact: true }).click();
  await expect(page.getByLabel("习惯名称")).toHaveValue("晨间阅读");
  await page.getByLabel("习惯名称").fill("晨间深度阅读");
  await page.getByRole("button", { name: "保存习惯修改" }).click();

  await expect(page.getByRole("heading", { name: "晨间深度阅读" })).toBeVisible();
  expect(updateRequest).toMatchObject({
    name: "晨间深度阅读",
    expectedUpdatedAt: timestamp,
  });
});

test("已有习惯进入编辑时回填名称与目标字段", async ({ page }) => {
  const item: HabitDayResponse["items"][number] = {
    id: "00000000-0000-4000-8000-000000000011",
    name: "喝水",
    targetType: "count",
    targetValue: 10,
    unit: "次",
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    startDate: "2026-09-01",
    colorKey: "app-teal",
    status: "active",
    value: 0,
    completed: false,
    streak: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    if (await fulfillShellRequest(route, path)) return;
    if (path === "/habits" && request.method() === "GET") {
      return fulfill(route, {
        date: "2026-09-03",
        items: [item],
        history: [],
        summary: { planned: 1, completed: 0, bestStreak: 0, completionRate30: 0 },
      });
    }
    return fulfill(route, {});
  });

  await page.goto("/habits");
  await page.getByRole("button", { name: "编辑“喝水”", exact: true }).click();

  await expect(page.getByLabel("习惯名称")).toHaveValue("喝水");
  await expect(page.getByRole("combobox", { name: "目标类型" })).toContainText("累计次数");
  await expect(page.getByLabel("每日目标")).toHaveValue("10");
  await expect(page.getByLabel("单位")).toHaveValue("次");
});

test("健身记录创建后可编辑体重并刷新趋势数据", async ({ page }) => {
  let log: FitnessResponse["logs"][number] | null = null;
  let updateRequest: unknown = null;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = request.method();
    if (await fulfillShellRequest(route, path)) return;

    if (path === "/fitness" && method === "GET") {
      return fulfill(route, {
        profile: null,
        logs: log ? [log] : [],
        summary: {
          currentWeightGram: log?.weightGram ?? null,
          distanceToTargetGram: null,
          bmi: null,
          averageWeight7Gram: log?.weightGram ?? null,
          goalProgress: null,
        },
      });
    }
    if (path === "/fitness/logs" && method === "POST") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      const input = fitnessLogInputSchema.parse(request.postDataJSON());
      log = {
        ...input,
        note: input.note ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      return fulfill(route, { id: input.id });
    }
    if (path.startsWith("/fitness/logs/") && method === "PATCH") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      const input = updateFitnessLogSchema.parse(request.postDataJSON());
      updateRequest = input;
      const { expectedUpdatedAt, ...values } = input;
      expect(expectedUpdatedAt).toBe(timestamp);
      if (log) log = { ...log, ...values, note: values.note ?? null, updatedAt: editedTimestamp };
      return fulfill(route, { updated: true });
    }
    return fulfill(route, {});
  });

  await page.goto("/fitness");
  await expect(page.getByRole("dialog", { name: "目标设置" })).toBeHidden();
  await page.getByRole("button", { name: "目标设置", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "目标设置" })).toBeVisible();
  await expect(page.getByLabel("目标体重（kg）")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "目标设置" })).toBeHidden();

  await page.getByRole("button", { name: "记录今天", exact: true }).click();
  const weightInput = page.getByRole("textbox", { name: "体重（kg）:", exact: true });
  await weightInput.fill("65.5");
  await page.getByRole("button", { name: "保存今日记录" }).click();
  await expect(page.getByRole("row").filter({ hasText: "65.5 kg" })).toBeVisible();

  const editButton = page.getByRole("button", { name: /编辑.*健身记录/ });
  await editButton.scrollIntoViewIfNeeded();
  await expect(editButton).toBeInViewport();
  await editButton.click();
  await expect(weightInput).toHaveValue("65.5");
  await weightInput.fill("64.8");
  await page.getByRole("button", { name: "保存记录修改" }).click();

  await expect(page.getByRole("row").filter({ hasText: "64.8 kg" })).toBeVisible();
  expect(updateRequest).toMatchObject({
    weightGram: 64_800,
    expectedUpdatedAt: timestamp,
  });
});

test("待买物品创建后可编辑数量与预算", async ({ page }) => {
  let item: ShoppingItem | null = null;
  let updateRequest: unknown = null;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    const method = request.method();
    if (await fulfillShellRequest(route, path)) return;

    if (path === "/shopping" && method === "GET") {
      return fulfill(route, {
        items: item ? [item] : [],
        summary: {
          wantedCount: item?.status === "wanted" ? 1 : 0,
          estimatedBudgetFen:
            item?.status === "wanted" && item.estimatedUnitPriceFen !== null
              ? item.quantity * item.estimatedUnitPriceFen
              : 0,
          purchasedThisMonth: 0,
        },
      });
    }
    if (path === "/shopping/items" && method === "POST") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      const input = createShoppingItemSchema.parse(request.postDataJSON());
      item = {
        ...input,
        unit: input.unit ?? null,
        note: input.note ?? null,
        status: "wanted",
        actualUnitPriceFen: null,
        purchasedOn: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      return fulfill(route, { id: input.id });
    }
    if (path.startsWith("/shopping/items/") && method === "PUT") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      const input = updateShoppingItemSchema.parse(request.postDataJSON());
      updateRequest = input;
      const { expectedUpdatedAt, ...values } = input;
      expect(expectedUpdatedAt).toBe(timestamp);
      if (item) {
        item = {
          ...item,
          ...values,
          unit: values.unit ?? null,
          note: values.note ?? null,
          updatedAt: editedTimestamp,
        };
      }
      return fulfill(route, { updated: true });
    }
    return fulfill(route, {});
  });

  await page.goto("/shopping");
  await page.getByRole("button", { name: "加入待买", exact: true }).click();
  await page.getByLabel("物品名称").fill("旅行收纳盒");
  await page.getByLabel("数量").fill("2");
  await page.getByLabel("预计单价（元）").fill("12.5");
  await page.getByRole("button", { name: "加入待买清单" }).click();
  await expect(page.getByText("旅行收纳盒", { exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "操作" })).toBeVisible();

  const shoppingEditButton = page.getByRole("button", {
    name: "编辑“旅行收纳盒”",
    exact: true,
  });
  await shoppingEditButton.scrollIntoViewIfNeeded();
  await expect(shoppingEditButton).toBeInViewport();
  await shoppingEditButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("物品名称")).toHaveValue("旅行收纳盒");
  await expect(page.getByLabel("数量")).toHaveValue("2");
  await expect(page.getByLabel("预计单价（元）")).toHaveValue("12.5");
  await page.getByLabel("数量").fill("3");
  await page.getByLabel("预计单价（元）").fill("15");
  const saveButton = page.getByRole("button", { name: "保存物品修改" });
  await saveButton.focus();
  await page.keyboard.press("Enter");

  const updatedRow = page.getByRole("row").filter({ hasText: "旅行收纳盒" });
  await expect(updatedRow).toContainText("3件");
  await expect(updatedRow).toContainText("¥15.00");
  expect(updateRequest).toMatchObject({
    quantity: 3,
    estimatedUnitPriceFen: 1_500,
    expectedUpdatedAt: timestamp,
  });
});

test("日程编辑时回填全部可编辑字段", async ({ page }) => {
  const listId = "00000000-0000-4000-8000-000000000021";
  const item: ScheduleResponse["items"][number] = {
    id: "00000000-0000-4000-8000-000000000022",
    title: "验证编辑回填",
    date: "2026-09-03",
    time: "20:00",
    listId,
    priority: "high",
    note: "保留原日程备注",
    reminderMinutesBefore: 30,
    status: "pending",
    completedAt: null,
    isOverdue: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    if (await fulfillShellRequest(route, path)) return;
    if (path === "/schedule" && request.method() === "GET") {
      return fulfill(route, {
        lists: [{ id: listId, name: "工作", colorKey: "app-teal" }],
        items: [item],
        summary: { today: 1, overdue: 0, next7Days: 1, completed: 0 },
      });
    }
    return fulfill(route, {});
  });

  await page.goto("/schedule");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "操作" })).toBeVisible();
  await page.getByRole("button", { name: "编辑“验证编辑回填”", exact: true }).click();

  await expect(page.getByLabel("事项", { exact: true })).toHaveValue("验证编辑回填");
  await expect(page.getByRole("note", { name: "提醒能力说明" })).toContainText(
    "仅在工作台打开时显示站内提醒",
  );
  await expect(page.getByRole("combobox", { name: "日期" })).toContainText("2026-09-03");
  await expect(page.getByRole("combobox", { name: "时间" })).toContainText("20:00");
  await expect(page.getByRole("combobox", { name: "清单" })).toContainText("工作");
  await expect(page.getByRole("combobox", { name: "优先级" })).toContainText("高");
  await expect(page.getByRole("combobox", { name: "到时提醒" })).toContainText("提前 30 分钟");
  await expect(page.getByLabel("备注")).toHaveValue("保留原日程备注");
});

test("书影音编辑时回填全部可编辑字段", async ({ page }) => {
  const item: MediaItem = {
    id: "00000000-0000-4000-8000-000000000031",
    name: "犬夜叉",
    type: "anime",
    status: "in_progress",
    rating: 5,
    recordedOn: "2026-09-03",
    completedOn: null,
    review: "灵魂同源，不同的命运",
    coverAssetId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    if (await fulfillShellRequest(route, path)) return;
    if (path === "/media-items" && request.method() === "GET") {
      return fulfill(route, {
        items: [item],
        summary: {
          completedThisYear: 0,
          averageRating: null,
          favoriteType: null,
          ratingDistribution: {},
        },
      });
    }
    return fulfill(route, {});
  });

  await page.goto("/media");
  await page.getByRole("button", { name: "编辑“犬夜叉”", exact: true }).click();

  await expect(page.getByLabel("作品名称")).toHaveValue("犬夜叉");
  await expect(page.getByRole("combobox", { name: "类型" })).toContainText("动漫");
  await expect(page.getByRole("combobox", { name: "状态", exact: true })).toContainText("进行中");
  await expect(page.getByRole("combobox", { name: "评分" })).toContainText("5 分");
  await expect(page.getByLabel("一句话短评")).toHaveValue("灵魂同源，不同的命运");
});
