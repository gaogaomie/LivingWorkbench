import {
  ANNOUNCE_EVENT,
  type NotificationEventDetail,
  type NotificationLevel,
} from "./announcement-events";

function show(level: NotificationLevel, message: string) {
  if (typeof window !== "undefined") {
    const detail: NotificationEventDetail = {
      message,
      urgent: level === "error" || level === "warning",
      level,
    };
    window.dispatchEvent(
      new CustomEvent(ANNOUNCE_EVENT, {
        detail,
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
