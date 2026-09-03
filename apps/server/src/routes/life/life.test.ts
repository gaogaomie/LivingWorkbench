import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../app";
import { createDatabase } from "../../db/client";
import { migrateDatabase } from "../../db/migrate";
import { AuthService } from "../../services/auth.service";
import { testServerConfig } from "../../test/config";

const database = createDatabase(":memory:");
migrateDatabase(database);
const authService = new AuthService(database.db, 30);
await authService.initializeAdmin("life-owner", "correct-horse-battery-staple");
const app = await buildApp({ logger: false, config: testServerConfig, database });

let cookie = "";
let csrfToken = "";
const date = "2026-09-02";
const headers = () => ({
  cookie,
  origin: testServerConfig.appOrigin,
  "x-csrf-token": csrfToken,
});

beforeAll(async () => {
  vi.setSystemTime("2026-09-02T08:00:00.000Z");
  await app.ready();
  const login = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: testServerConfig.appOrigin },
    payload: { username: "life-owner", password: "correct-horse-battery-staple" },
  });
  cookie =
    (Array.isArray(login.headers["set-cookie"])
      ? login.headers["set-cookie"][0]
      : login.headers["set-cookie"]
    )?.split(";", 1)[0] ?? "";
  csrfToken = login.json().data.csrfToken;
});

afterAll(async () => {
  await app.close();
  vi.useRealTimers();
});

describe("life module routes", () => {
  it("creates and completes a habit with analytics", async () => {
    const id = "10000000-0000-4000-8000-000000000001";
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/habits",
          headers: headers(),
          payload: {
            id,
            name: "喝水",
            targetType: "count",
            targetValue: 8,
            unit: "杯",
            weekdays: [0, 1, 2, 3, 4, 5, 6],
            startDate: date,
            colorKey: "app-teal",
          },
        })
      ).statusCode,
    ).toBe(201);
    expect(
      (
        await app.inject({
          method: "PUT",
          url: `/api/v1/habits/${id}/progress`,
          headers: headers(),
          payload: { date, value: 8 },
        })
      ).statusCode,
    ).toBe(200);
    const day = await app.inject({
      method: "GET",
      url: `/api/v1/habits?date=${date}`,
      headers: { cookie },
    });
    expect(day.json()).toMatchObject({
      data: {
        summary: { planned: 1, completed: 1 },
        history: expect.arrayContaining([{ date, planned: 1, completed: 1, rate: 1 }]),
      },
    });
    expect(day.json().data.history).toHaveLength(30);
  });

  it("saves a fitness profile and daily log with derived metrics", async () => {
    await app.inject({
      method: "PUT",
      url: "/api/v1/fitness/profile",
      headers: headers(),
      payload: {
        heightCm: 170,
        birthYear: null,
        sexForFormula: null,
        startWeightGram: 70_000,
        targetWeightGram: 60_000,
        targetDate: "2027-01-01",
      },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/fitness/logs",
      headers: headers(),
      payload: {
        id: "10000000-0000-4000-8000-000000000002",
        date,
        weightGram: 68_000,
        bodyFatBasisPoints: null,
        calorieIntakeKcal: null,
        exerciseMinutes: 30,
        steps: 8_000,
        note: null,
      },
    });
    const fitness = await app.inject({
      method: "GET",
      url: `/api/v1/fitness?today=${date}`,
      headers: { cookie },
    });
    expect(fitness.json()).toMatchObject({
      data: { summary: { currentWeightGram: 68_000, bmi: 23.5, goalProgress: 0.2 } },
    });
  });

  it("creates and completes a todo", async () => {
    const schedule = await app.inject({
      method: "GET",
      url: `/api/v1/schedule?today=${date}`,
      headers: { cookie },
    });
    const listId = schedule.json().data.lists[0].id;
    const id = "10000000-0000-4000-8000-000000000003";
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/schedule/todos",
          headers: headers(),
          payload: {
            id,
            title: "整理房间",
            date,
            time: null,
            listId,
            priority: "normal",
            note: null,
            reminderMinutesBefore: null,
          },
        })
      ).statusCode,
    ).toBe(201);
    await app.inject({
      method: "PATCH",
      url: `/api/v1/schedule/todos/${id}/status`,
      headers: headers(),
      payload: { status: "completed" },
    });
    const after = await app.inject({
      method: "GET",
      url: `/api/v1/schedule?today=${date}`,
      headers: { cookie },
    });
    expect(after.json().data.summary.completed).toBe(1);
  });

  it("validates and returns due schedule reminders", async () => {
    const schedule = await app.inject({
      method: "GET",
      url: `/api/v1/schedule?today=${date}`,
      headers: { cookie },
    });
    const listId = schedule.json().data.lists[0].id;
    const id = "10000000-0000-4000-8000-000000000013";
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/schedule/todos",
          headers: headers(),
          payload: {
            id,
            title: "出门开会",
            date,
            time: "09:30",
            listId,
            priority: "high",
            note: null,
            reminderMinutesBefore: 30,
          },
        })
      ).statusCode,
    ).toBe(201);

    const due = await app.inject({
      method: "GET",
      url: `/api/v1/schedule/reminders/due?from=${date}T09:00&to=${date}T09:00`,
      headers: { cookie },
    });
    expect(due.json()).toMatchObject({
      data: {
        items: [
          {
            id,
            title: "出门开会",
            date,
            time: "09:30",
            remindAt: `${date}T09:00`,
            reminderMinutesBefore: 30,
          },
        ],
      },
    });

    const invalid = await app.inject({
      method: "POST",
      url: "/api/v1/schedule/todos",
      headers: headers(),
      payload: {
        id: "10000000-0000-4000-8000-000000000014",
        title: "无时间提醒",
        date,
        time: null,
        listId,
        priority: "normal",
        note: null,
        reminderMinutesBefore: 10,
      },
    });
    expect(invalid.statusCode).toBe(400);

    await app.inject({
      method: "PATCH",
      url: `/api/v1/schedule/todos/${id}/status`,
      headers: headers(),
      payload: { status: "completed" },
    });
    const afterCompletion = await app.inject({
      method: "GET",
      url: `/api/v1/schedule/reminders/due?from=${date}T09:00&to=${date}T09:00`,
      headers: { cookie },
    });
    expect(afterCompletion.json().data.items).toEqual([]);
  });

  it("moves a shopping item into the purchased state", async () => {
    const id = "10000000-0000-4000-8000-000000000004";
    await app.inject({
      method: "POST",
      url: "/api/v1/shopping/items",
      headers: headers(),
      payload: {
        id,
        name: "牛奶",
        quantity: 2,
        unit: "盒",
        categoryId: "food",
        estimatedUnitPriceFen: 1_500,
        priority: "soon",
        note: null,
      },
    });
    const wanted = await app.inject({
      method: "GET",
      url: "/api/v1/shopping?month=2026-09",
      headers: { cookie },
    });
    expect(wanted.json().data.summary.estimatedBudgetFen).toBe(3_000);
    await app.inject({
      method: "PATCH",
      url: `/api/v1/shopping/items/${id}/status`,
      headers: headers(),
      payload: { status: "purchased", actualUnitPriceFen: 1_400, purchasedOn: date },
    });
    const purchased = await app.inject({
      method: "GET",
      url: "/api/v1/shopping?month=2026-09",
      headers: { cookie },
    });
    expect(purchased.json().data.summary).toMatchObject({
      wantedCount: 0,
      estimatedBudgetFen: 0,
      purchasedThisMonth: 1,
    });
  });

  it("calculates completed media statistics", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/media-items",
      headers: headers(),
      payload: {
        id: "10000000-0000-4000-8000-000000000005",
        name: "测试电影",
        type: "movie",
        status: "completed",
        rating: 5,
        recordedOn: date,
        completedOn: date,
        review: "很好看",
      },
    });
    const media = await app.inject({
      method: "GET",
      url: "/api/v1/media-items?year=2026",
      headers: { cookie },
    });
    expect(media.json().data.summary).toMatchObject({
      completedThisYear: 1,
      averageRating: 5,
      favoriteType: "movie",
    });
  });

  it("projects every life module into the read-only timeline", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/timeline?from=${date}&to=${date}`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.nextCursor).toBeNull();
    expect(
      new Set(response.json().data.items.map((item: { source: string }) => item.source)),
    ).toEqual(new Set(["habit", "fitness", "schedule", "shopping", "media"]));
  });

  it("paginates the timeline with an opaque cursor and no duplicate records", async () => {
    const first = await app.inject({
      method: "GET",
      url: `/api/v1/timeline?from=${date}&to=${date}&limit=2`,
      headers: { cookie },
    });
    const firstData = first.json().data as {
      items: Array<{ id: string }>;
      nextCursor: string;
    };
    expect(firstData.items).toHaveLength(2);
    expect(firstData.nextCursor).toBeTruthy();

    const second = await app.inject({
      method: "GET",
      url: `/api/v1/timeline?from=${date}&to=${date}&limit=2&cursor=${firstData.nextCursor}`,
      headers: { cookie },
    });
    const secondIds = second.json().data.items.map((item: { id: string }) => item.id);
    expect(secondIds).toHaveLength(2);
    expect(secondIds).not.toContain(firstData.items[0]?.id);
    expect(secondIds).not.toContain(firstData.items[1]?.id);
  });

  it("returns one aggregate payload for the overview", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/overview?date=${date}`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      date,
      habits: { planned: 1, completed: 1 },
      schedule: { today: 0, overdue: 0 },
    });
    expect(response.json().data.recent.length).toBeLessThanOrEqual(3);
  });

  it("updates every life record and rejects a stale edit", async () => {
    const habitBefore = (
      await app.inject({ method: "GET", url: `/api/v1/habits?date=${date}`, headers: { cookie } })
    ).json().data.items[0];
    const habitPayload = {
      name: "喝温水",
      targetType: habitBefore.targetType,
      targetValue: habitBefore.targetValue,
      unit: habitBefore.unit,
      weekdays: habitBefore.weekdays,
      startDate: habitBefore.startDate,
      colorKey: habitBefore.colorKey,
      expectedUpdatedAt: habitBefore.updatedAt,
    };
    expect(
      (
        await app.inject({
          method: "PUT",
          url: `/api/v1/habits/${habitBefore.id}`,
          headers: headers(),
          payload: habitPayload,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "PUT",
          url: `/api/v1/habits/${habitBefore.id}`,
          headers: headers(),
          payload: habitPayload,
        })
      ).statusCode,
    ).toBe(409);

    const fitnessBefore = (
      await app.inject({ method: "GET", url: `/api/v1/fitness?today=${date}`, headers: { cookie } })
    ).json().data.logs[0];
    expect(
      (
        await app.inject({
          method: "PATCH",
          url: `/api/v1/fitness/logs/${fitnessBefore.id}`,
          headers: headers(),
          payload: {
            date: fitnessBefore.date,
            weightGram: 67_500,
            bodyFatBasisPoints: fitnessBefore.bodyFatBasisPoints,
            calorieIntakeKcal: fitnessBefore.calorieIntakeKcal,
            exerciseMinutes: fitnessBefore.exerciseMinutes,
            steps: fitnessBefore.steps,
            note: fitnessBefore.note,
            expectedUpdatedAt: fitnessBefore.updatedAt,
          },
        })
      ).statusCode,
    ).toBe(200);

    const scheduleBefore = (
      await app.inject({
        method: "GET",
        url: `/api/v1/schedule?today=${date}`,
        headers: { cookie },
      })
    ).json().data.items[0];
    await app.inject({
      method: "PUT",
      url: `/api/v1/schedule/todos/${scheduleBefore.id}`,
      headers: headers(),
      payload: {
        title: "整理卧室",
        date: scheduleBefore.date,
        time: scheduleBefore.time,
        listId: scheduleBefore.listId,
        priority: scheduleBefore.priority,
        note: scheduleBefore.note,
        reminderMinutesBefore: scheduleBefore.reminderMinutesBefore,
        expectedUpdatedAt: scheduleBefore.updatedAt,
      },
    });

    const shoppingBefore = (
      await app.inject({
        method: "GET",
        url: "/api/v1/shopping?month=2026-09",
        headers: { cookie },
      })
    ).json().data.items[0];
    await app.inject({
      method: "PUT",
      url: `/api/v1/shopping/items/${shoppingBefore.id}`,
      headers: headers(),
      payload: {
        name: "低脂牛奶",
        quantity: shoppingBefore.quantity,
        unit: shoppingBefore.unit,
        categoryId: shoppingBefore.categoryId,
        estimatedUnitPriceFen: shoppingBefore.estimatedUnitPriceFen,
        priority: shoppingBefore.priority,
        note: shoppingBefore.note,
        expectedUpdatedAt: shoppingBefore.updatedAt,
      },
    });

    const mediaBefore = (
      await app.inject({ method: "GET", url: "/api/v1/media-items?year=2026", headers: { cookie } })
    ).json().data.items[0];
    await app.inject({
      method: "PUT",
      url: `/api/v1/media-items/${mediaBefore.id}`,
      headers: headers(),
      payload: {
        name: "测试电影·编辑版",
        type: mediaBefore.type,
        status: mediaBefore.status,
        rating: mediaBefore.rating,
        recordedOn: mediaBefore.recordedOn,
        completedOn: mediaBefore.completedOn,
        review: mediaBefore.review,
        expectedUpdatedAt: mediaBefore.updatedAt,
      },
    });

    const habitAfter = (
      await app.inject({ method: "GET", url: `/api/v1/habits?date=${date}`, headers: { cookie } })
    ).json().data.items[0];
    expect(habitAfter.name).toBe("喝温水");
  });

  it("soft deletes and restores records through the unified trash", async () => {
    const moduleRequests = [
      ["habit", `/api/v1/habits?date=${date}`, "items"],
      ["fitness", `/api/v1/fitness?today=${date}`, "logs"],
      ["schedule", `/api/v1/schedule?today=${date}`, "items"],
      ["shopping", "/api/v1/shopping?month=2026-09", "items"],
      ["media", "/api/v1/media-items?year=2026", "items"],
    ] as const;
    const records: Array<{ source: string; id: string; updatedAt: string }> = [];
    for (const [source, url, key] of moduleRequests) {
      const response = await app.inject({ method: "GET", url, headers: { cookie } });
      const record = response.json().data[key][0] as { id: string; updatedAt: string };
      records.push({ source, ...record });
    }

    const conflict = await app.inject({
      method: "DELETE",
      url: `/api/v1/trash/habit/${records[0]?.id}`,
      headers: headers(),
      payload: { expectedUpdatedAt: "2020-01-01T00:00:00.000Z" },
    });
    expect(conflict.statusCode).toBe(409);

    for (const record of records) {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/trash/${record.source}/${record.id}`,
        headers: headers(),
        payload: { expectedUpdatedAt: record.updatedAt },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ code: 200, message: "success", data: null });
    }

    const trash = await app.inject({ method: "GET", url: "/api/v1/trash", headers: { cookie } });
    expect(trash.json().data.items).toHaveLength(5);
    expect(new Set(trash.json().data.items.map((item: { source: string }) => item.source))).toEqual(
      new Set(["habit", "fitness", "schedule", "shopping", "media"]),
    );

    for (const item of trash.json().data.items as Array<{
      source: string;
      id: string;
      deletedAt: string;
    }>) {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/trash/${item.source}/${item.id}/restore`,
        headers: headers(),
        payload: { expectedDeletedAt: item.deletedAt },
      });
      expect(response.statusCode).toBe(200);
    }
    const emptyTrash = await app.inject({
      method: "GET",
      url: "/api/v1/trash",
      headers: { cookie },
    });
    expect(emptyTrash.json().data.items).toEqual([]);
  });
});
