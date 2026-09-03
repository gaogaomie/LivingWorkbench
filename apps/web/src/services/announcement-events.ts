export const ANNOUNCE_EVENT = "daily-life:announce";

export type NotificationLevel = "success" | "error" | "warning" | "info";

export interface NotificationEventDetail {
  message: string;
  urgent: boolean;
  level: NotificationLevel;
}
