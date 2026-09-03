import { type CreateTodo, todoPriorityLabels } from "@daily-life/shared";
import { Button, DatePicker, Form, FormItem, Input, Select, TimePicker } from "animal-island-ui";
import { useState } from "react";
import { notify } from "@/services/notification.service";

const priorityOptions = Object.entries(todoPriorityLabels).map(([key, label]) => ({ key, label }));
const reminderOptions = [
  { key: "none", label: "不提醒" },
  { key: "0", label: "到时提醒" },
  { key: "10", label: "提前 10 分钟" },
  { key: "30", label: "提前 30 分钟" },
  { key: "60", label: "提前 1 小时" },
  { key: "1440", label: "提前 1 天" },
] as const;
const reminderValues = {
  none: null,
  "0": 0,
  "10": 10,
  "30": 30,
  "60": 60,
  "1440": 1_440,
} as const satisfies Record<string, CreateTodo["reminderMinutesBefore"]>;

interface ScheduleCreateFormProps {
  defaultDate: string;
  listOptions: ReadonlyArray<{ key: string; label: string }>;
  isSubmitting: boolean;
  onSubmit: (input: CreateTodo) => void;
}

type Priority = CreateTodo["priority"];
type ReminderKey = keyof typeof reminderValues;

function isPriority(value: string): value is Priority {
  return priorityOptions.some((option) => option.key === value);
}

function isReminderKey(value: string): value is ReminderKey {
  return Object.hasOwn(reminderValues, value);
}

export function ScheduleCreateForm({
  defaultDate,
  listOptions,
  isSubmitting,
  onSubmit,
}: ScheduleCreateFormProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState<string | null>(null);
  const [listId, setListId] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [note, setNote] = useState("");
  const [reminder, setReminder] = useState<ReminderKey>("none");

  const submit = () => {
    if (!title.trim()) {
      notify.error("请填写待办事项。");
      return;
    }
    if (reminder !== "none" && !time) {
      notify.error("设置提醒前请先选择具体时间。");
      return;
    }
    onSubmit({
      id: crypto.randomUUID(),
      title: title.trim(),
      date,
      time: time ? time.slice(0, 5) : null,
      listId: listId || null,
      priority,
      note: note.trim() || null,
      reminderMinutesBefore: reminderValues[reminder],
    });
  };

  return (
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
            aria-label="日期"
            value={date}
            onChange={(value) => typeof value === "string" && setDate(value)}
          />
        </FormItem>
        <FormItem name="time" label="时间">
          <TimePicker
            aria-label="时间"
            format="HH:mm"
            value={time ?? ""}
            onChange={setTime}
            allowClear
          />
        </FormItem>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <FormItem name="listId" label="清单">
          <div className="w-fit max-w-full">
            <Select
              aria-label="清单"
              options={[{ key: "", label: "未分类" }, ...listOptions]}
              value={listId}
              onChange={setListId}
            />
          </div>
        </FormItem>
        <FormItem name="priority" label="优先级">
          <div className="w-fit max-w-full">
            <Select
              aria-label="优先级"
              options={[...priorityOptions]}
              value={priority}
              onChange={(value) => isPriority(value) && setPriority(value)}
            />
          </div>
        </FormItem>
      </div>
      <FormItem name="reminder" label="到时提醒">
        <div className="w-fit max-w-full">
          <Select
            aria-label="到时提醒"
            options={[...reminderOptions]}
            value={reminder}
            onChange={(value) => isReminderKey(value) && setReminder(value)}
          />
        </div>
      </FormItem>
      <FormItem name="note" label="备注">
        <Input value={note} onChange={(event) => setNote(event.target.value)} allowClear />
      </FormItem>
      <Button type="primary" htmlType="submit" block loading={isSubmitting}>
        加入日程
      </Button>
    </Form>
  );
}
