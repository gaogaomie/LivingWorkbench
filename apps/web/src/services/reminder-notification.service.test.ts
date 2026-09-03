// @vitest-environment jsdom

import type { DueRemindersResponse } from "@daily-life/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ANNOUNCE_EVENT, type NotificationEventDetail } from "./announcement-events";
import {
  deliverReminder,
  getBrowserNotificationStatus,
  requestBrowserNotificationPermission,
} from "./reminder-notification.service";

const reminder = {
  id: "10000000-0000-4000-8000-000000000099",
  title: "喝水",
  date: "2026-09-03",
  time: "20:30",
  remindAt: "2026-09-03T20:30",
  reminderMinutesBefore: 0,
} satisfies DueRemindersResponse["items"][number];

class MockNotification {
  static permission: NotificationPermission = "granted";
  static requestPermission = vi.fn(async (): Promise<NotificationPermission> => "granted");
  static instances: MockNotification[] = [];
  onclick: ((event: Event) => void) | null = null;
  close = vi.fn();

  constructor(
    readonly title: string,
    readonly options?: NotificationOptions,
  ) {
    MockNotification.instances.push(this);
  }
}

describe("reminder notification service", () => {
  afterEach(() => {
    window.localStorage.clear();
    MockNotification.instances = [];
    MockNotification.requestPermission.mockClear();
    vi.unstubAllGlobals();
  });

  it("获得权限后发送一次浏览器通知并持久化去重", () => {
    vi.stubGlobal("Notification", MockNotification);

    expect(deliverReminder(reminder)).toBe("browser");
    expect(deliverReminder(reminder)).toBe("duplicate");
    expect(MockNotification.instances).toHaveLength(1);
    expect(MockNotification.instances[0]).toMatchObject({
      title: "日程提醒",
      options: {
        body: "20:30 喝水",
        tag: `${reminder.id}:${reminder.remindAt}`,
      },
    });
  });

  it("未获得权限时使用站内提醒兜底", () => {
    const fallbackReminder = { ...reminder, id: "10000000-0000-4000-8000-000000000098" };
    const messages: NotificationEventDetail[] = [];
    const listener = (event: Event) => {
      messages.push((event as CustomEvent<NotificationEventDetail>).detail);
    };
    window.addEventListener(ANNOUNCE_EVENT, listener);

    expect(deliverReminder(fallbackReminder)).toBe("toast");
    expect(messages).toContainEqual({
      level: "info",
      message: "日程提醒：20:30 喝水",
      urgent: false,
    });
    window.removeEventListener(ANNOUNCE_EVENT, listener);
  });

  it("只在浏览器支持时申请通知权限", async () => {
    expect(getBrowserNotificationStatus()).toBe("unsupported");
    expect(await requestBrowserNotificationPermission()).toBe("unsupported");

    MockNotification.permission = "default";
    vi.stubGlobal("Notification", MockNotification);
    expect(await requestBrowserNotificationPermission()).toBe("granted");
    expect(MockNotification.requestPermission).toHaveBeenCalledOnce();
  });
});
