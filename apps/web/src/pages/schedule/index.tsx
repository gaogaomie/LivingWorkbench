import { type ScheduleResponse, todoPriorityLabels } from "@daily-life/shared";
import {
  Button,
  Card,
  DatePicker,
  Form,
  FormItem,
  Input,
  Select,
  Table,
  type TableColumn,
  Tag,
  TimePicker,
  Title,
} from "animal-island-ui";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { RecordEditorActions, RecordEditorDrawer } from "@/components/RecordEditorDrawer";
import { ScheduleCreateForm } from "@/components/record-editors/ScheduleCreateForm";
import { ScheduleReminderCapabilityNote } from "@/components/record-editors/ScheduleReminderCapabilityNote";
import { useSchedule, useScheduleMutations } from "@/data-provider/life";
import { formatLocalDate } from "@/presentation/domain-formatters";
import { notify } from "@/services/notification.service";
import {
  type BrowserNotificationStatus,
  getBrowserNotificationStatus,
  requestBrowserNotificationPermission,
} from "@/services/reminder-notification.service";
import { WeekSchedule } from "./WeekSchedule";

const priorityOptions = Object.entries(todoPriorityLabels).map(([key, label]) => ({ key, label }));
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
const scheduleEditorFormId = "schedule-editor-form";

function reminderLabel(minutes: number | null): string | null {
  if (minutes === null) return null;
  return reminderOptions.find((option) => option.key === String(minutes))?.label ?? null;
}

function BrowserNotificationControl() {
  const [status, setStatus] = useState<BrowserNotificationStatus>(getBrowserNotificationStatus);
  const enable = async () => {
    const permission = await requestBrowserNotificationPermission();
    setStatus(permission);
    if (permission === "granted") {
      notify.success("浏览器提醒已启用。");
    } else if (permission === "denied") {
      notify.warning("浏览器已阻止通知，请在地址栏的网站权限中允许通知。");
    } else {
      notify.warning("当前浏览器无法启用系统通知，将继续使用站内提醒。");
    }
  };

  if (status === "granted") {
    return (
      <p className="m-0 text-sm text-[var(--animal-text-color-secondary)]">浏览器提醒已启用</p>
    );
  }
  if (status === "denied") {
    return (
      <p className="m-0 text-sm text-[var(--animal-text-color-secondary)]">
        浏览器通知已被阻止，请在地址栏的网站权限中改为允许。
      </p>
    );
  }
  if (status === "unsupported") {
    return (
      <p className="m-0 text-sm text-[var(--animal-text-color-secondary)]">
        当前浏览器不支持系统通知，将继续使用站内提醒。
      </p>
    );
  }
  return (
    <Button type="default" onClick={enable}>
      启用浏览器提醒
    </Button>
  );
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
  const [editorOpen, setEditorOpen] = useState(false);
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
    setEditorOpen(false);
  };
  const openCreateEditor = () => {
    clearEditor();
    setEditorOpen(true);
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
  const visibleItemsById = new Map(visibleItems.map((item) => [item.id, item]));
  const tableData: Record<string, unknown>[] = visibleItems.map((item) => ({
    ...item,
  }));
  const tableColumns: TableColumn[] = [
    {
      title: "优先级",
      dataIndex: "priority",
      width: 110,
      render: (_value, record) => {
        const item = typeof record.id === "string" ? visibleItemsById.get(record.id) : undefined;
        if (!item) return null;
        return (
          <Tag
            size="small"
            variant="soft"
            color={item.isOverdue ? "app-red" : priorityTagColors[item.priority]}
          >
            {item.isOverdue ? "已逾期" : todoPriorityLabels[item.priority]}
          </Tag>
        );
      },
    },
    {
      title: "事项",
      dataIndex: "title",
      width: 260,
      render: (_value, record) => {
        const item = typeof record.id === "string" ? visibleItemsById.get(record.id) : undefined;
        if (!item) return null;
        return (
          <div className="grid gap-1">
            <strong>{item.title}</strong>
            {item.note ? (
              <span className="text-sm text-[var(--animal-text-color-secondary)]">{item.note}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "日期",
      dataIndex: "date",
      width: 150,
      render: (value) => (typeof value === "string" ? formatLocalDate(value) : "—"),
    },
    {
      title: "时间",
      dataIndex: "time",
      width: 100,
      render: (value) => (typeof value === "string" ? value : "全天"),
    },
    {
      title: "提醒",
      dataIndex: "reminderMinutesBefore",
      width: 150,
      render: (value) => (typeof value === "number" ? reminderLabel(value) : null) ?? "不提醒",
    },
    {
      title: "操作",

      align: "right",
      fixed: "right",

      render: (_value, record) => {
        const item = typeof record.id === "string" ? visibleItemsById.get(record.id) : undefined;
        if (!item) return null;
        return (
          <div className="flex flex-nowrap items-center justify-end gap-2.5">
            <Button
              type="dashed"
              size="small"
              aria-label={`${item.status === "completed" ? "恢复" : "完成"}“${item.title}”`}
              onClick={() =>
                mutations.status.mutate({
                  id: item.id,
                  status: item.status === "completed" ? "pending" : "completed",
                })
              }
            >
              {item.status === "completed" ? "恢复" : "完成"}
            </Button>
            <Button
              type="default"
              size="small"
              aria-label={`编辑“${item.title}”`}
              onClick={() => beginEdit(item)}
            >
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
        );
      },
    },
  ];
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
    if (!editing) return;
    mutations.update.mutate(
      { ...values, id: editing.id, expectedUpdatedAt: editing.updatedAt },
      {
        onSuccess: () => {
          clearEditor();
          notify.success("待办已更新。");
        },
      },
    );
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
    setEditorOpen(true);
  };

  return (
    <section className="grid min-w-0 gap-7 [&>*]:min-w-0">
      <header className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end [&_h1]:my-2 [&_h1]:font-sans [&_h1]:text-[clamp(30px,4vw,46px)] [&_h1]:leading-[1.18] [&_h1]:text-[var(--animal-text-color)] [&_p]:m-0 [&_p]:max-w-[680px] [&_p]:text-island-muted">
        <div>
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
            日程统筹
          </p>
          <h1>把事情放到合适的日子</h1>
          <p>时间可以留空作为全天事项；启用浏览器通知后，切到其他页面也能收到提醒。</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <BrowserNotificationControl />
          <Button type="primary" size="large" onClick={openCreateEditor}>
            加入日程
          </Button>
        </div>
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
        <WeekSchedule today={today} items={schedule.data?.items ?? []} />
      </Card>

      <div className="flex w-full flex-col items-start gap-[18px]">
        <div className="flex min-h-12 w-full items-start justify-between gap-3 sm:min-h-[54px] sm:gap-[18px] [&>:first-child]:flex-none [&_.animal-select]:mt-1 [&_.animal-select]:w-[min(200px,52%)] sm:[&_.animal-select]:w-[min(220px,48%)]">
          <Title color="app-teal">待办事项</Title>
          <Select
            aria-label="筛选待办事项"
            options={filterOptions}
            value={filter}
            onChange={setFilter}
          />
        </div>
        <Card className="w-full overflow-hidden p-3 sm:p-5">
          <Table
            columns={tableColumns}
            dataSource={tableData}
            rowKey="id"
            loading={schedule.isPending}
            scroll={{ x: 1_000 }}
            emptyText={
              <div className="grid min-h-[160px] place-items-center gap-4 px-6 py-10 text-center text-[var(--animal-text-color-secondary)]">
                <p className="m-0">当前筛选下没有事项。</p>
                <Button type="primary" onClick={openCreateEditor}>
                  添加第一项日程
                </Button>
              </div>
            }
          />
        </Card>
      </div>

      <RecordEditorDrawer
        open={editorOpen}
        title={editing ? "编辑日程" : "加入日程"}
        onClose={clearEditor}
        protectUnsavedChanges
        footer={
          editing ? (
            <RecordEditorActions
              formId={scheduleEditorFormId}
              saveLabel="保存日程修改"
              isSaving={mutations.update.isPending}
              onCancel={clearEditor}
            />
          ) : undefined
        }
        wide
      >
        {editing ? (
          <Form
            key={editing.id}
            id={scheduleEditorFormId}
            initialValues={{
              title: editing.title,
              date: editing.date,
              time: editing.time,
              listId: editing.listId ?? "",
              priority: editing.priority,
              reminder:
                editing.reminderMinutesBefore === null
                  ? "none"
                  : String(editing.reminderMinutesBefore),
              note: editing.note ?? "",
            }}
            layout="vertical"
            onFinish={submit}
          >
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
                    options={priorityOptions}
                    value={priority}
                    onChange={setPriority}
                  />
                </div>
              </FormItem>
            </div>
            <FormItem name="reminder" label="到时提醒">
              <div className="grid max-w-full gap-2">
                <div className="w-fit max-w-full">
                  <Select
                    aria-label="到时提醒"
                    options={reminderOptions}
                    value={reminder}
                    onChange={setReminder}
                  />
                </div>
                <ScheduleReminderCapabilityNote />
              </div>
            </FormItem>
            <FormItem name="note" label="备注">
              <Input value={note} onChange={(event) => setNote(event.target.value)} allowClear />
            </FormItem>
          </Form>
        ) : editorOpen ? (
          <ScheduleCreateForm
            defaultDate={today}
            listOptions={listOptions}
            isSubmitting={mutations.create.isPending}
            onSubmit={(input) => mutations.create.mutate(input, { onSuccess: clearEditor })}
          />
        ) : null}
      </RecordEditorDrawer>
    </section>
  );
}
