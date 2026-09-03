import { Notification } from "animal-island-ui";
import { ANNOUNCE_EVENT } from "./announcement-events";

type NotificationLevel = "success" | "error" | "warning" | "info";

function show(level: NotificationLevel, message: string) {
  Notification[level](message);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(ANNOUNCE_EVENT, {
        detail: { message, urgent: level === "error" || level === "warning" },
      }),
    );
  }
}

/** 视觉 Toast 与屏幕阅读器播报共用同一个入口。 */
export const notify = {
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
  warning: (message: string) => show("warning", message),
  info: (message: string) => show("info", message),
};
