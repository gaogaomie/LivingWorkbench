import type { HabitDayItem } from "@daily-life/shared";
import {
  Button,
  Card,
  DatePicker,
  Form,
  FormItem,
  Input,
  Select,
  Tag,
  Title,
} from "animal-island-ui";
import { format } from "date-fns";
import { useState } from "react";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { useHabitMutations, useHabits } from "@/data-provider/life";
import { notify } from "@/services/notification.service";

const targetOptions = [
  { key: "boolean", label: "完成一次" },
  { key: "count", label: "累计次数" },
  { key: "duration", label: "累计时长" },
];

function progressLabel(item: HabitDayItem): string {
  if (item.targetType === "boolean") return item.completed ? "今天已完成" : "今天待完成";
  return `${item.value} / ${item.targetValue} ${item.unit}`;
}

function heatLevel(rate: number): number {
  if (rate <= 0) return 0;
  return Math.max(1, Math.ceil(rate * 4));
}

// Tailwind 需要看到完整类名才能生成产物，因此热力等级在这里显式列出。
const heatLevelClasses = [
  "bg-[color-mix(in_srgb,var(--animal-primary-color)_7%,white)]",
  "bg-[color-mix(in_srgb,var(--animal-primary-color)_25%,white)]",
  "bg-[color-mix(in_srgb,var(--animal-primary-color)_45%,white)]",
  "bg-[color-mix(in_srgb,var(--animal-primary-color)_68%,white)]",
  "bg-[var(--animal-primary-color)] text-white",
] as const;

export function Component() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [name, setName] = useState("");
  const [targetType, setTargetType] = useState("boolean");
  const [targetValue, setTargetValue] = useState("1");
  const [unit, setUnit] = useState("次");
  const [editing, setEditing] = useState<HabitDayItem | null>(null);
  const habits = useHabits(date);
  const mutations = useHabitMutations(date);
  const clearEditor = () => {
    setEditing(null);
    setName("");
    setTargetType("boolean");
    setTargetValue("1");
    setUnit("次");
  };

  const submit = () => {
    const parsedTarget = targetType === "boolean" ? 1 : Number(targetValue);
    if (!name.trim() || !Number.isInteger(parsedTarget) || parsedTarget <= 0 || !unit.trim()) {
      notify.error("请填写习惯名称、正整数目标和单位。");
      return;
    }
    const values = {
      name: name.trim(),
      targetType: targetType as "boolean" | "count" | "duration",
      targetValue: parsedTarget,
      unit: unit.trim(),
      weekdays: editing?.weekdays ?? [0, 1, 2, 3, 4, 5, 6],
      startDate: editing?.startDate ?? date,
      colorKey: editing?.colorKey ?? "app-teal",
    };
    if (editing) {
      mutations.update.mutate(
        { ...values, id: editing.id, expectedUpdatedAt: editing.updatedAt },
        {
          onSuccess: () => {
            clearEditor();
            notify.success("习惯已更新。");
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

  const beginEdit = (item: HabitDayItem) => {
    setEditing(item);
    setName(item.name);
    setTargetType(item.targetType);
    setTargetValue(String(item.targetValue));
    setUnit(item.unit);
  };

  const updateProgress = (item: HabitDayItem, delta: number) => {
    const next =
      item.targetType === "boolean" ? (item.completed ? 0 : 1) : Math.max(0, item.value + delta);
    mutations.progress.mutate({ id: item.id, value: next });
  };

  return (
    <section className="grid gap-7">
      <header className="flex flex-col items-start justify-between gap-6 [&_h1]:my-2 [&_h1]:font-sans [&_h1]:text-[clamp(30px,4vw,46px)] [&_h1]:leading-[1.18] [&_h1]:text-[var(--animal-text-color)] [&_p]:m-0 [&_p]:max-w-[680px] [&_p]:text-island-muted sm:flex-row sm:items-end">
        <div>
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
            习惯健康
          </p>
          <h1>把坚持拆成今天</h1>
          <p>布尔、计数和时长习惯都可以即时调整，历史打卡不会因暂停而丢失。</p>
        </div>
        <DatePicker
          value={date}
          onChange={(value) => typeof value === "string" && setDate(value)}
        />
      </header>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
        <Card
          color="app-teal"
          className="min-h-32 p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>今日完成</p>
          <strong>
            {habits.data ? `${habits.data.summary.completed}/${habits.data.summary.planned}` : "—"}
          </strong>
        </Card>
        <Card
          color="app-yellow"
          className="min-h-32 p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>最佳连续</p>
          <strong>{habits.data ? `${habits.data.summary.bestStreak} 天` : "—"}</strong>
        </Card>
        <Card
          color="warm-peach-pink"
          className="relative min-h-[136px] overflow-visible p-6 pr-[118px] sm:min-h-32 sm:pr-[clamp(104px,8vw,128px)] [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>30 天完成率</p>
          <strong>
            {habits.data ? `${Math.round(habits.data.summary.completionRate30 * 100)}%` : "—"}
          </strong>
          <img
            className="pointer-events-none absolute bottom-0 right-3 h-auto max-h-[calc(100%+24px)] w-[100px] select-none object-contain object-right-bottom sm:right-2 sm:w-[clamp(88px,7vw,112px)]"
            src="/brand/module-ip-transparent/K2-habits-bamboo-right.png"
            alt=""
            aria-hidden="true"
            width={1254}
            height={1254}
          />
        </Card>
      </div>

      <Card className="px-[22px] py-[26px] sm:px-7">
        <div className="mb-5 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end [&_.eyebrow]:m-0 [&_h2]:mb-0 [&_h2]:mt-1 [&>p]:m-0 [&>p]:text-[var(--animal-text-color-secondary)]">
          <div>
            <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
              近 30 天
            </p>
            <h2>坚持热力图</h2>
          </div>
          <p>颜色越深，当天计划完成得越充分。</p>
        </div>
        <ol
          className="m-0 grid list-none grid-cols-6 gap-[9px] p-0 sm:grid-cols-15"
          aria-label="近 30 天习惯完成情况"
        >
          {habits.data?.history.map((day) => (
            <li
              className={`grid min-h-[42px] place-items-center rounded-[var(--animal-border-radius-sm)] border-[length:var(--animal-border-width)] border-[color-mix(in_srgb,var(--animal-primary-color)_18%,transparent)] text-[length:var(--animal-font-size-sm)] font-extrabold ${heatLevelClasses[heatLevel(day.rate)]} ${
                day.planned === 0 ? "border-dashed opacity-[0.65]" : ""
              }`}
              key={day.date}
              title={`${day.date}：${day.completed}/${day.planned}`}
              aria-label={`${day.date}，完成 ${day.completed} 项，共计划 ${day.planned} 项`}
            >
              <span>{day.date.slice(8)}</span>
            </li>
          ))}
        </ol>
        <div
          className="mt-3.5 flex items-center justify-end gap-1.5 text-[length:var(--animal-font-size-sm)] text-[var(--animal-text-color-secondary)]"
          aria-hidden="true"
        >
          <span>少</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i
              className={`size-4 rounded-[5px] border-[length:var(--animal-border-width)] border-[color-mix(in_srgb,var(--animal-primary-color)_18%,transparent)] ${heatLevelClasses[level]}`}
              key={level}
            />
          ))}
          <span>多</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(340px,0.8fr)_minmax(440px,1.2fr)]">
        <div className="flex flex-col items-start gap-[18px] lg:sticky lg:top-6 lg:self-start">
          <div className="flex min-h-12 w-full items-start justify-between gap-3 sm:min-h-[54px] sm:gap-[18px] [&>:first-child]:flex-none [&_.animal-select]:mt-1 [&_.animal-select]:w-[min(200px,52%)] sm:[&_.animal-select]:w-[min(220px,48%)]">
            <Title color="app-yellow">{editing ? "编辑习惯" : "新增习惯"}</Title>
          </div>
          <Card className="w-full p-[22px] sm:p-7 [&_h2]:mt-0 [&_.animal-date-picker]:w-full [&_.animal-time-picker]:w-full [&_.animal-select]:w-full">
            <Form layout="vertical" onFinish={submit}>
              <FormItem name="name" label="习惯名称">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例如：喝水"
                  allowClear
                />
              </FormItem>
              <FormItem name="targetType" label="目标类型">
                <Select
                  options={targetOptions}
                  value={targetType}
                  onChange={(value) => {
                    setTargetType(value);
                    if (value === "boolean") {
                      setTargetValue("1");
                      setUnit("次");
                    }
                  }}
                />
              </FormItem>
              {targetType !== "boolean" ? (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <FormItem name="targetValue" label="每日目标">
                    <Input
                      inputMode="numeric"
                      value={targetValue}
                      onChange={(event) => setTargetValue(event.target.value)}
                    />
                  </FormItem>
                  <FormItem name="unit" label="单位">
                    <Input
                      value={unit}
                      onChange={(event) => setUnit(event.target.value)}
                      placeholder="杯 / 页 / 分钟"
                    />
                  </FormItem>
                </div>
              ) : null}
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={mutations.create.isPending || mutations.update.isPending}
              >
                {editing ? "保存习惯修改" : "开始这个习惯"}
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
            <Title color="app-teal">今日习惯</Title>
            <span className="mt-1 whitespace-nowrap rounded-full bg-[var(--animal-primary-color-bg)] px-[13px] py-2 text-xs font-extrabold leading-none text-[var(--animal-primary-color-active)] sm:text-[length:var(--animal-font-size-sm)]">
              {habits.data?.items.length ?? 0} 项
            </span>
          </div>
          {habits.isPending ? (
            <Card className="grid min-h-[140px] w-full place-items-center px-6 py-[42px] text-center text-[var(--animal-text-color-secondary)]">
              正在读取今日习惯…
            </Card>
          ) : null}
          {habits.data?.items.length === 0 ? (
            <Card
              type="dashed"
              className="grid min-h-[140px] w-full place-items-center px-6 py-[42px] text-center text-[var(--animal-text-color-secondary)]"
            >
              还没有习惯，从左边创建第一个吧。
            </Card>
          ) : null}
          {habits.data?.items.map((item) => (
            <Card
              className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-4 p-6 sm:grid-cols-[minmax(180px,1fr)_minmax(92px,auto)_minmax(300px,auto)] sm:items-center sm:gap-6 [&>div:last-child]:col-span-2 [&>div:last-child]:w-full sm:[&>div:last-child]:col-span-1 sm:[&>div:last-child]:w-auto ${
                item.completed ? "border-[var(--animal-success-color)]" : ""
              }`}
              key={item.id}
            >
              <div className="min-w-0 [&_h2]:mb-[5px] [&_h2]:mt-0 [&_p]:m-0 [&_p]:leading-relaxed [&_p]:text-[var(--animal-text-color-secondary)]">
                <h2>{item.name}</h2>
                <p>
                  {progressLabel(item)} · 连续 {item.streak} 天
                </p>
              </div>
              <div className="grid justify-items-center gap-1.5 text-center [&_strong]:text-[length:var(--animal-font-size-lg)] [&_strong]:text-[var(--animal-primary-color-active)]">
                <Tag
                  size="small"
                  variant="soft"
                  color={
                    item.status === "active"
                      ? "app-teal"
                      : item.status === "paused"
                        ? "app-yellow"
                        : "default"
                  }
                >
                  {item.status === "active"
                    ? "进行中"
                    : item.status === "paused"
                      ? "已暂停"
                      : "已归档"}
                </Tag>
                <strong>
                  {item.completed
                    ? "100%"
                    : `${Math.min(100, Math.round((item.value / item.targetValue) * 100))}%`}
                </strong>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <Button
                  type="dashed"
                  size="small"
                  disabled={item.status !== "active"}
                  loading={mutations.progress.isPending}
                  onClick={() => updateProgress(item, item.targetType === "duration" ? 10 : 1)}
                >
                  {item.targetType === "boolean"
                    ? item.completed
                      ? "撤销完成"
                      : "完成今天"
                    : item.targetType === "duration"
                      ? "+10 分钟"
                      : "+1"}
                </Button>
                {item.targetType !== "boolean" ? (
                  <Button
                    type="default"
                    size="small"
                    disabled={item.status !== "active" || item.value === 0}
                    onClick={() => updateProgress(item, item.targetType === "duration" ? -10 : -1)}
                  >
                    减少
                  </Button>
                ) : null}
                <Button
                  type="default"
                  size="small"
                  onClick={() =>
                    mutations.status.mutate({
                      id: item.id,
                      status: item.status === "active" ? "paused" : "active",
                    })
                  }
                >
                  {item.status === "active" ? "暂停" : "恢复"}
                </Button>
                <Button type="dashed" size="small" onClick={() => beginEdit(item)}>
                  编辑
                </Button>
                <DeleteRecordButton
                  source="habit"
                  id={item.id}
                  label={item.name}
                  expectedUpdatedAt={item.updatedAt}
                  appearance="button"
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
