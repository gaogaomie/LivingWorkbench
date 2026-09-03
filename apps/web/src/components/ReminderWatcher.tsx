import { useEffect } from "react";
import { useDueReminders } from "../data-provider/life";
import { deliverReminder } from "../services/reminder-notification.service";

export function ReminderWatcher() {
  const reminders = useDueReminders();

  useEffect(() => {
    for (const reminder of reminders.data?.items ?? []) {
      deliverReminder(reminder);
    }
  }, [reminders.data]);

  return null;
}
