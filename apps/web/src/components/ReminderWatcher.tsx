import { useEffect, useRef } from "react";
import { useDueReminders } from "../data-provider/life";
import { notify } from "../services/notification.service";

export function ReminderWatcher() {
  const reminders = useDueReminders();
  const shown = useRef(new Set<string>());

  useEffect(() => {
    for (const reminder of reminders.data?.items ?? []) {
      const key = `${reminder.id}:${reminder.remindAt}`;
      if (shown.current.has(key)) continue;
      shown.current.add(key);
      notify.info(`日程提醒：${reminder.time} ${reminder.title}`);
    }
  }, [reminders.data]);

  return null;
}
