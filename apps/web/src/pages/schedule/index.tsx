import type { ScheduleResponse } from "@daily-life/shared";
import {
  Button,
  Card,
  DatePicker,
  Form,
  FormItem,
  Input,
  Select,
  Tag,
  TimePicker,
  Title,
} from "animal-island-ui";
import { addDays, format, startOfWeek } from "date-fns";
import { useMemo, useState } from "react";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { useSchedule, useScheduleMutations } from "@/data-provider/life";
import { notify } from "@/services/notification.service";

const priorityOptions = [
  { key: "low", label: "低" },
  { key: "normal", label: "普通" },
  { key: "high", label: "高" },
  { key: "urgent", label: "紧急" },
];
const priorityLabels = Object.fromEntries(priorityOptions.map((item) => [item.key, item.label]));
const priorityTagColors = {
  low: "default",
  normal: "app-teal",
  high: "app-orange",
  urgent: "app-red",
} as const;
const filterOptions = [
  { key: "all", label: "全部" },
  { key: "today", label: "今天" },
  { key: "planned", label: "计划内" },
  { key: "completed", label: "已完成" },
];
const reminderOptions = [
  { key: "none", label: "不提醒" },
  { key: "0", label: "到时提醒" },
  { key: "10", label: "提前 10 分钟" },
  { key: "30", label: "提前 30 分钟" },
  { key: "60", label: "提前 1 小时" },
  { key: "1440", label: "提前 1 天" },
];

function reminderLabel(minutes: number | null): string | null {
  if (minutes === null) return null;
  return reminderOptions.find((option) => option.key === String(minutes))?.label ?? null;
}

export function Component() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState<string | null>(null);
  const [listId, setListId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [note, setNote] = useState("");
  const [reminder, setReminder] = useState("none");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<ScheduleResponse["items"][number] | null>(null);
  const schedule = useSchedule(today);
  const mutations = useScheduleMutations(today);
  const clearEditor = () => {
    setEditing(null);
    setTitle("");
    setDate(today);
    setTime(null);
    setListId("");
    setPriority("normal");
    setNote("");
    setReminder("none");
  };
  const listOptions = (schedule.data?.lists ?? []).map((list) => ({
    key: list.id,
    label: list.name,
  }));
  const visibleItems = useMemo(
    () =>
      (schedule.data?.items ?? []).filter((item) => {
        if (filter === "today") return item.date === today && item.status === "pending";
        if (filter === "planned") return item.date >= today && item.status === "pending";
        if (filter === "completed") return item.status === "completed";
        return true;
      }),
    [filter, schedule.data, today],
  );
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(new Date(`${today}T12:00:00`), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => {
      const current = addDays(weekStart, index);
      const currentDate = format(current, "yyyy-MM-dd");
      return {
        date: currentDate,
        weekday: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][index],
        day: format(current, "MM/dd"),
        items: (schedule.data?.items ?? []).filter((item) => item.date === currentDate),
      };
    });
  }, [schedule.data?.items, today]);

  const submit = () => {
    if (!title.trim()) {
      notify.error("请填写待办事项。");
      return;
    }
    if (reminder !== "none" && !time) {
      notify.error("设置提醒前请先选择具体时间。");
      return;
    }
    const values = {
      title: title.trim(),
      date,
      time: time ? time.slice(0, 5) : null,
      listId: listId || null,
      priority: priority as "low" | "normal" | "high" | "urgent",
      note: note.trim() || null,
      reminderMinutesBefore:
        reminder === "none" ? null : (Number(reminder) as 0 | 10 | 30 | 60 | 1_440),
    };
    if (editing) {
      mutations.update.mutate(
        { ...values, id: editing.id, expectedUpdatedAt: editing.updatedAt },
        {
          onSuccess: () => {
            clearEditor();
            notify.success("待办已更新。");
          },
        },
      );
    } else {
      mutations.create.mutate(
        { ...values, id: crypto.randomUUID() },
        {
          onSuccess: clearEditor,
        },
      );
    }
  };

  const beginEdit = (item: ScheduleResponse["items"][number]) => {
    setEditing(item);
    setTitle(item.title);
    setDate(item.date);
    setTime(item.time);
    setListId(item.listId ?? "");
    setPriority(item.priority);
    setNote(item.note ?? "");
    setReminder(item.reminderMinutesBefore === null ? "none" : String(item.reminderMinutesBefore));
  };

  return (
    <section className="grid min-w-0 gap-7 [&>*]:min-w-0">
      <header className="[&_h1]:my-2 [&_h1]:font-sans [&_h1]:text-[clamp(30px,4vw,46px)] [&_h1]:leading-[1.18] [&_h1]:text-[var(--animal-text-color)] [&>p]:m-0 [&>p]:max-w-[680px] [&>p]:text-island-muted">
        <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
          日程统筹
        </p>
        <h1>把事情放到合适的日子</h1>
        <p>时间可以留空作为全天事项；提醒会在工作台打开时通过站内 Toast 出现。</p>
      </header>
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        <Card
          color="app-teal"
          className="min-h-32 p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>今天</p>
          <strong>{schedule.data?.summary.today ?? "—"}</strong>
        </Card>
        <Card
          color="app-red"
          className="min-h-32 p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>逾期</p>
          <strong>{schedule.data?.summary.overdue ?? "—"}</strong>
        </Card>
        <Card
          color="app-yellow"
          className="min-h-32 p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>未来 7 天</p>
          <strong>{schedule.data?.summary.next7Days ?? "—"}</strong>
        </Card>
        <Card
          color="app-green"
          className="relative min-h-[136px] overflow-visible p-6 pr-[118px] sm:min-h-32 sm:pr-[clamp(104px,8vw,128px)] [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>已完成</p>
          <strong>{schedule.data?.summary.completed ?? "—"}</strong>
          <img
            className="pointer-events-none absolute bottom-0 right-3 h-auto max-h-[calc(100%+24px)] w-[100px] select-none object-contain object-right-bottom sm:right-2 sm:w-[clamp(88px,7vw,112px)]"
            src="/brand/ip-animals-transparent/E2-panda-right.png"
            alt=""
            aria-hidden="true"
            width={1254}
            height={1254}
          />
        </Card>
      </div>

      <Card className="px-[22px] py-[26px] sm:px-7">
        <div className="mb-[22px] flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end [&_.eyebrow]:m-0 [&_h2]:mb-0 [&_h2]:mt-1 [&>p]:m-0 [&>p]:text-[var(--animal-text-color-secondary)]">
          <div>
            <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
              本周视图
            </p>
            <h2>七天安排</h2>
          </div>
          <p>全天事项与定时事项放在同一条日程线上。</p>
        </div>
        <div className="min-w-0 max-w-full overflow-x-auto px-0.5 pb-2 pt-0.5">
          <ol
            className="m-0 grid min-w-[920px] list-none grid-cols-7 gap-2.5 p-0"
            aria-label="本周七天日程"
          >
            {weekDays.map((day) => (
              <li
                className={`min-h-[210px] rounded-[var(--animal-border-radius-base)] border-[length:var(--animal-border-width)] p-3.5 ${
                  day.date === today
                    ? "border-[var(--animal-primary-color)] bg-[var(--animal-primary-color-bg)]"
                    : "border-[var(--animal-border-color-light)] bg-[var(--animal-surface-color)]"
                }`}
                key={day.date}
              >
                <div className="flex items-baseline justify-between gap-2 border-b-[var(--animal-border-width)] border-dashed border-[var(--animal-border-color-light)] pb-2.5 [&_span]:text-[length:var(--animal-font-size-sm)] [&_span]:text-[var(--animal-text-color-secondary)]">
                  <strong>{day.weekday}</strong>
                  <span>{day.day}</span>
                </div>
                <div className="mt-2.5 grid gap-2 [&_p]:m-0 [&_p]:rounded-[var(--animal-border-radius-sm)] [&_p]:bg-[var(--animal-bg-color)] [&_p]:p-2 [&_p_span]:mb-[3px] [&_p_span]:block [&_p_span]:text-[length:var(--animal-font-size-sm)] [&_p_span]:text-[var(--animal-primary-color-active)] [&_p_strong]:block [&_p_strong]:overflow-hidden [&_p_strong]:text-ellipsis [&_p_strong]:whitespace-nowrap [&_p_strong]:text-[length:var(--animal-font-size-sm)] [&_small]:text-[length:var(--animal-font-size-sm)] [&_small]:text-[var(--animal-text-color-secondary)]">
                  {day.items.slice(0, 3).map((item) => (
                    <p
                      className={
                        item.status === "completed"
                          ? "opacity-[0.58] [&_strong]:line-through"
                          : undefined
                      }
                      key={item.id}
                    >
                      <span>{item.time ?? "全天"}</span>
                      <strong>{item.title}</strong>
                    </p>
                  ))}
                  {day.items.length === 0 ? <small>暂无安排</small> : null}
                  {day.items.length > 3 ? <small>另有 {day.items.length - 3} 项</small> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(340px,0.8fr)_minmax(440px,1.2fr)]">
        <div className="flex flex-col items-start gap-[18px] lg:sticky lg:top-6 lg:self-start">
          <div className="flex min-h-12 w-full items-start justify-between gap-3 sm:min-h-[54px] sm:gap-[18px] [&>:first-child]:flex-none [&_.animal-select]:mt-1 [&_.animal-select]:w-[min(200px,52%)] sm:[&_.animal-select]:w-[min(220px,48%)]">
            <Title color="app-yellow">{editing ? "编辑日程" : "加入日程"}</Title>
          </div>
          <Card className="w-full p-[22px] sm:p-7 [&_h2]:mt-0 [&_.animal-date-picker]:w-full [&_.animal-time-picker]:w-full [&_.animal-select]:w-full">
            <Form layout="vertical" onFinish={submit}>
              <FormItem name="title" label="事项">
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="今天要做什么？"
                  allowClear
                />
              </FormItem>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <FormItem name="date" label="日期">
                  <DatePicker
                    value={date}
                    onChange={(value) => typeof value === "string" && setDate(value)}
                  />
                </FormItem>
                <FormItem name="time" label="时间">
                  <TimePicker format="HH:mm" value={time ?? ""} onChange={setTime} allowClear />
                </FormItem>
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <FormItem name="listId" label="清单">
                  <Select
                    options={[{ key: "", label: "未分类" }, ...listOptions]}
                    value={listId}
                    onChange={setListId}
                  />
                </FormItem>
                <FormItem name="priority" label="优先级">
                  <Select options={priorityOptions} value={priority} onChange={setPriority} />
                </FormItem>
              </div>
              <FormItem name="reminder" label="到时提醒">
                <Select options={reminderOptions} value={reminder} onChange={setReminder} />
              </FormItem>
              <FormItem name="note" label="备注">
                <Input value={note} onChange={(event) => setNote(event.target.value)} allowClear />
              </FormItem>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={mutations.create.isPending || mutations.update.isPending}
              >
                {editing ? "保存日程修改" : "加入日程"}
              </Button>
              {editing ? (
                <Button htmlType="button" block onClick={clearEditor}>
                  取消编辑
                </Button>
              ) : null}
            </Form>
          </Card>
        </div>

        <div className="flex w-full flex-col items-start gap-[18px]">
          <div className="flex min-h-12 w-full items-start justify-between gap-3 sm:min-h-[54px] sm:gap-[18px] [&>:first-child]:flex-none [&_.animal-select]:mt-1 [&_.animal-select]:w-[min(200px,52%)] sm:[&_.animal-select]:w-[min(220px,48%)]">
            <Title color="app-teal">待办事项</Title>
            <Select options={filterOptions} value={filter} onChange={setFilter} />
          </div>
          <Card className="w-full p-[22px] sm:p-7">
            {visibleItems.length === 0 ? (
              <p className="grid min-h-[140px] w-full place-items-center px-6 py-[42px] text-center text-[var(--animal-text-color-secondary)]">
                当前筛选下没有事项。
              </p>
            ) : null}
            <div className="grid">
              {visibleItems.map((item) => (
                <article
                  className={`grid grid-cols-1 items-start gap-3.5 border-b-[var(--animal-border-width)] border-dashed border-[var(--animal-border-color-light)] px-1 py-[18px] [contain-intrinsic-size:88px] [content-visibility:auto] last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 ${
                    item.status === "completed" ? "[&>div:first-child]:opacity-[0.65]" : ""
                  }`}
                  key={item.id}
                >
                  <div className="min-w-0 [&_strong]:my-[5px] [&_p]:m-0 [&_p]:leading-relaxed [&_p]:text-[var(--animal-text-color-secondary)]">
                    <Tag
                      size="small"
                      variant="soft"
                      color={item.isOverdue ? "app-red" : priorityTagColors[item.priority]}
                    >
                      {item.isOverdue ? "已逾期" : priorityLabels[item.priority]}
                    </Tag>
                    <strong>{item.title}</strong>
                    <p>
                      {item.date} · {item.time ?? "全天"}
                      {reminderLabel(item.reminderMinutesBefore)
                        ? ` · ${reminderLabel(item.reminderMinutesBefore)}`
                        : ""}
                      {item.note ? ` · ${item.note}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2.5">
                    <Button
                      type="dashed"
                      size="small"
                      onClick={() =>
                        mutations.status.mutate({
                          id: item.id,
                          status: item.status === "completed" ? "pending" : "completed",
                        })
                      }
                    >
                      {item.status === "completed" ? "恢复" : "完成"}
                    </Button>
                    <Button type="default" size="small" onClick={() => beginEdit(item)}>
                      编辑
                    </Button>
                    <DeleteRecordButton
                      source="schedule"
                      id={item.id}
                      label={item.title}
                      expectedUpdatedAt={item.updatedAt}
                      appearance="button"
                    />
                  </div>
                </article>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
