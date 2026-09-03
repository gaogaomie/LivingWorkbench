import { type ScheduleResponse, todoStatusLabels } from "@daily-life/shared";
import { Button, Modal, Tag } from "animal-island-ui";
import { addDays, format, startOfWeek } from "date-fns";
import { useMemo, useRef, useState } from "react";
import { formatMonthDay } from "@/presentation/domain-formatters";

const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const visibleItemCount = 2;

interface WeekScheduleProps {
  today: string;
  items: ScheduleResponse["items"];
}

export function WeekSchedule({ today, items }: WeekScheduleProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const detailsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(new Date(`${today}T12:00:00`), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => {
      const current = addDays(weekStart, index);
      const currentDate = format(current, "yyyy-MM-dd");
      return {
        date: currentDate,
        weekday: weekdays[index] ?? "",
        day: formatMonthDay(currentDate),
        items: items.filter((item) => item.date === currentDate),
      };
    });
  }, [items, today]);
  const selectedDay = weekDays.find((day) => day.date === selectedDate) ?? null;

  const openDetails = (date: string, trigger: HTMLButtonElement) => {
    detailsTriggerRef.current = trigger;
    setSelectedDate(date);
  };
  const closeDetails = () => {
    setSelectedDate(null);
    window.requestAnimationFrame(() => detailsTriggerRef.current?.focus());
  };

  return (
    <>
      <div className="min-w-0 max-w-full overflow-x-auto px-0.5 pb-2 pt-0.5">
        <ol
          className="m-0 grid min-w-[920px] list-none grid-cols-7 gap-2 p-0"
          aria-label="本周七天日程"
        >
          {weekDays.map((day) => {
            const hiddenItemCount = Math.max(0, day.items.length - visibleItemCount);
            return (
              <li
                className={`h-48 overflow-hidden rounded-[var(--animal-border-radius-base)] border-[length:var(--animal-border-width)] p-3 ${
                  day.date === today
                    ? "border-[var(--animal-primary-color)] bg-[var(--animal-primary-color-bg)]"
                    : "border-[var(--animal-border-color-light)] bg-[var(--animal-surface-color)]"
                }`}
                key={day.date}
              >
                <div className="flex min-h-7 items-center justify-between gap-2 border-b-[var(--animal-border-width)] border-dashed border-[var(--animal-border-color-light)] pb-2 text-sm">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <strong>{day.weekday}</strong>
                    {hiddenItemCount > 0 ? (
                      <button
                        type="button"
                        className="rounded-full leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--animal-primary-color)]"
                        aria-label={`查看${day.weekday} ${day.day}的另外 ${hiddenItemCount} 项日程`}
                        onClick={(event) => openDetails(day.date, event.currentTarget)}
                      >
                        <Tag size="small" variant="soft" color="app-teal">
                          +{hiddenItemCount}
                        </Tag>
                      </button>
                    ) : null}
                  </div>
                  <span className="text-xs text-[var(--animal-text-color-secondary)]">
                    {day.day}
                  </span>
                </div>
                <div className="mt-2 grid gap-2">
                  {day.items.slice(0, visibleItemCount).map((item) => (
                    <div
                      className={`rounded-[var(--animal-border-radius-sm)] bg-[var(--animal-bg-color)] px-2.5 py-2 ${
                        item.status === "completed" ? "opacity-60 [&_strong]:line-through" : ""
                      }`}
                      key={item.id}
                    >
                      <span className="block text-xs leading-tight text-[var(--animal-primary-color-active)]">
                        {item.time ?? "全天"}
                      </span>
                      <strong className="mt-1 block overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-tight">
                        {item.title}
                      </strong>
                    </div>
                  ))}
                  {day.items.length === 0 ? (
                    <small className="pt-1 text-sm text-[var(--animal-text-color-secondary)]">
                      暂无安排
                    </small>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <Modal
        open={selectedDay !== null}
        title={selectedDay ? `${selectedDay.weekday} · ${selectedDay.day}` : "当日日程"}
        width="min(520px, calc(100vw - 32px))"
        typewriter={false}
        maskClosable
        onClose={closeDetails}
        footer={<Button onClick={closeDetails}>关闭</Button>}
      >
        {selectedDay ? (
          <ol className="mx-auto my-0 grid max-h-[min(60vh,480px)] w-full max-w-md list-none gap-2 overflow-y-auto p-0 pr-1">
            {selectedDay.items.map((item) => (
              <li
                className="grid grid-cols-[72px_minmax(0,1fr)_72px] items-center justify-items-center gap-3 rounded-[var(--animal-border-radius-base)] border border-[var(--animal-border-color-light)] bg-[var(--animal-surface-color)] p-3 text-center"
                key={item.id}
              >
                <time className="text-sm font-bold text-[var(--animal-primary-color-active)]">
                  {item.time ?? "全天"}
                </time>
                <strong
                  className={`min-w-0 text-center [overflow-wrap:anywhere] ${
                    item.status === "completed" ? "text-island-muted line-through" : ""
                  }`}
                >
                  {item.title}
                </strong>
                <Tag
                  size="small"
                  variant="soft"
                  color={item.status === "completed" ? "default" : "app-teal"}
                >
                  {todoStatusLabels[item.status]}
                </Tag>
              </li>
            ))}
          </ol>
        ) : null}
      </Modal>
    </>
  );
}
