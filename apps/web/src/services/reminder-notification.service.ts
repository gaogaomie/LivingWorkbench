import type { DueRemindersResponse } from "@daily-life/shared";
import { notify } from "./notification.service";

const deliveredReminderStorageKey = "daily-life:delivered-reminders:v1";
const maxRememberedReminders = 200;
const sessionDeliveredReminders = new Set<string>();

export type BrowserNotificationStatus = NotificationPermission | "unsupported";

function reminderKey(reminder: DueRemindersResponse["items"][number]): string {
  return `${reminder.id}:${reminder.remindAt}`;
}

function readDeliveredReminders(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = JSON.parse(window.localStorage.getItem(deliveredReminderStorageKey) ?? "[]");
    return Array.isArray(stored)
      ? new Set(stored.filter((value): value is string => typeof value === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

function claimReminder(key: string): boolean {
  if (sessionDeliveredReminders.has(key)) return false;
  const delivered = readDeliveredReminders();
  if (delivered.has(key)) {
    sessionDeliveredReminders.add(key);
    return false;
  }

  sessionDeliveredReminders.add(key);
  delivered.add(key);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        deliveredReminderStorageKey,
        JSON.stringify([...delivered].slice(-maxRememberedReminders)),
      );
    } catch {
      return true;
    }
  }
  return true;
}

export function getBrowserNotificationStatus(): BrowserNotificationStatus {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationStatus> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function showBrowserReminder(
  reminder: DueRemindersResponse["items"][number],
  key: string,
): boolean {
  if (getBrowserNotificationStatus() !== "granted") return false;
  try {
    const notification = new Notification("日程提醒", {
      body: `${reminder.time} ${reminder.title}`,
      tag: key,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

export function deliverReminder(
  reminder: DueRemindersResponse["items"][number],
): "browser" | "toast" | "duplicate" {
  const key = reminderKey(reminder);
  if (!claimReminder(key)) return "duplicate";
  if (showBrowserReminder(reminder, key)) return "browser";
  notify.info(`日程提醒：${reminder.time} ${reminder.title}`);
  return "toast";
}
