import { Button, Card } from "animal-island-ui";
import { format } from "date-fns";
import { useState } from "react";
import { RecordEditorDrawer } from "@/components/RecordEditorDrawer";
import { FinanceEntryCreateForm } from "@/components/record-editors/FinanceEntryCreateForm";
import { FitnessLogCreateForm } from "@/components/record-editors/FitnessLogCreateForm";
import { ScheduleCreateForm } from "@/components/record-editors/ScheduleCreateForm";
import { ShoppingItemCreateForm } from "@/components/record-editors/ShoppingItemCreateForm";
import { useCreateFinanceEntry } from "@/data-provider/finance";
import {
  useFitnessMutations,
  useOverview,
  useSchedule,
  useScheduleMutations,
  useShoppingMutations,
} from "@/data-provider/life";
import { useServerHealth } from "@/data-provider/queries/use-server-health";
import { formatLocalDate, formatMoneyFen } from "@/presentation/domain-formatters";
import { AiSummarySection } from "./AiSummarySection";

const quickActions = [
  { label: "记一笔", key: "finance", primary: false },
  { label: "排日程", key: "schedule", primary: false },
  { label: "记体重", key: "fitness", primary: false },
  { label: "待买物品", key: "shopping", primary: false },
] as const;
type QuickEntry = (typeof quickActions)[number]["key"];
const quickEntryTitles: Record<QuickEntry, string> = {
  finance: "记一笔",
  schedule: "加入日程",
  fitness: "记录今天",
  shopping: "加入待买",
};
export function OverviewPage() {
  const health = useServerHealth();
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const month = today.slice(0, 7);
  const [quickEntry, setQuickEntry] = useState<QuickEntry | null>(null);
  const overview = useOverview(today);
  const financeEntry = useCreateFinanceEntry(month);
  const fitnessMutations = useFitnessMutations(today);
  const schedule = useSchedule(today, quickEntry === "schedule");
  const scheduleMutations = useScheduleMutations(today);
  const shoppingMutations = useShoppingMutations(month);
  const scheduleListOptions = (schedule.data?.lists ?? []).map((list) => ({
    key: list.id,
    label: list.name,
  }));
  const closeQuickEntry = () => setQuickEntry(null);

  return (
    <section className="grid gap-7">
      <header className="grid items-start gap-4 [&_h1]:my-2 [&_h1]:font-sans [&_h1]:text-[clamp(30px,4vw,46px)] [&_h1]:leading-[1.18] [&_h1]:text-(--animal-text-color) [&_p]:m-0 [&_p]:max-w-170 [&_p]:text-island-muted sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-6">
        <div className="min-w-0">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-(--animal-primary-color)">
            岛上今日
          </p>
          <h1>今天，慢慢来</h1>
          <p>账目、习惯、安排和喜欢，都在这里。</p>
        </div>
        <div className="flex items-end gap-3 justify-self-start sm:justify-self-end">
          <div
            className={`flex w-fit flex-none items-center gap-2 rounded-full border px-3.25 py-2.25 text-[13px] ${
              health.isError
                ? "border-(--animal-error-color) bg-(--animal-error-surface) text-(--animal-error-color-active) [&_span]:bg-(--animal-error-color)"
                : "border-(--animal-success-color) bg-(--animal-success-surface) text-(--animal-success-color-active) [&_span]:bg-(--animal-success-color)"
            } [&_span]:size-2 [&_span]:rounded-full`}
          >
            <span aria-hidden="true" />
            {health.isPending ? "正在连接云端" : health.isError ? "云端暂不可用" : "云端服务正常"}
          </div>
        </div>
      </header>

      <AiSummarySection date={now} />

      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-12">
        <Card
          className="group relative col-span-1 min-h-65 overflow-hidden p-8 sm:col-span-12 xl:col-span-5 [&>:not(img)]:relative [&>:not(img)]:z-1"
          color="warm-peach-pink"
        >
          <img
            className="pointer-events-none absolute right-4.5 top-5 z-0 h-auto w-22 select-none transition-transform motion-reduce:transition-none sm:w-[clamp(92px,8vw,120px)] sm:group-hover:-translate-x-0.5 sm:group-hover:-translate-y-0.5 sm:group-hover:-rotate-2"
            src="/brand/ip-animals-transparent/C1-snail-left.png"
            alt=""
            aria-hidden="true"
            width={1254}
            height={1254}
            draggable="false"
          />
          <p className="m-0 text-base font-extrabold leading-[1.4] tracking-[0.06em] text-(--animal-island-text-on-peach)">
            今日生活指数
          </p>
          <strong className="my-3 block text-7xl leading-none text-white">—</strong>
          <p className="mt-4 max-w-[calc(100%-92px)] leading-[1.7] text-white sm:max-w-[min(380px,calc(100%-112px))]">
            完成第一条有效记录后，这里会显示透明、可解释的生活指数。
          </p>
        </Card>

        <Card className="relative col-span-1 overflow-visible p-7.5 sm:col-span-12 xl:col-span-7 [&_h2]:mb-5 [&_h2]:mt-0 [&_h2]:text-xl">
          <h2>记下一件小事</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 [&_.animal-button]:min-h-14.5 ">
            {quickActions.map((action) => (
              <Button
                key={action.key}
                htmlType="button"
                type={action.primary ? "primary" : "default"}
                size="large"
                block
                onClick={() => setQuickEntry(action.key)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="col-span-1 p-6 sm:col-span-4 [&_p]:text-(--animal-text-color-secondary) [&_small]:text-(--animal-text-color-secondary) [&_strong]:my-1.5 [&_strong]:block [&_strong]:text-[34px]">
          <p>本月支出</p>
          <strong>{overview.data ? formatMoneyFen(overview.data.finance.expenseFen) : "—"}</strong>
          <small>{overview.data?.finance.entryCount ?? 0} 笔账目</small>
        </Card>
        <Card className="col-span-1 p-6 sm:col-span-4 [&_p]:text-(--animal-text-color-secondary) [&_small]:text-(--animal-text-color-secondary) [&_strong]:my-1.5 [&_strong]:block [&_strong]:text-[34px]">
          <p>今日习惯</p>
          <strong>
            {overview.data
              ? `${overview.data.habits.completed}/${overview.data.habits.planned}`
              : "—"}
          </strong>
          <small>完成后即时更新</small>
        </Card>
        <Card className="col-span-1 p-6 sm:col-span-4 [&_p]:text-(--animal-text-color-secondary) [&_small]:text-(--animal-text-color-secondary) [&_strong]:my-1.5 [&_strong]:block [&_strong]:text-[34px]">
          <p>今日待办</p>
          <strong>{overview.data?.schedule.today ?? "—"}</strong>
          <small>{overview.data?.schedule.overdue ?? 0} 项逾期</small>
        </Card>

        <Card
          className="col-span-1 min-h-37.5 p-7 sm:col-span-12 [&_h2]:mb-5 [&_h2]:mt-0 [&_h2]:text-xl [&_p]:text-(--animal-text-color-secondary)"
          type="dashed"
        >
          <h2>最近记录</h2>
          {overview.data?.recent.length ? (
            <div className="grid gap-2.5 [&_p]:m-0 [&_p]:grid [&_p]:grid-cols-[minmax(0,1fr)_auto_auto] [&_p]:gap-4.5 [&_p]:border-b [&_p]:border-dashed [&_p]:border-[var(--animal-border-color-light)] [&_p]:py-2.5 [&_p:last-child]:border-b-0">
              {overview.data.recent.map((item) => (
                <p key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{formatLocalDate(item.date)}</span>
                  <span>{item.summary}</span>
                </p>
              ))}
            </div>
          ) : (
            <p>保存任一生活记录后，它会出现在这里并进入时光档案。</p>
          )}
        </Card>
      </div>

      <RecordEditorDrawer
        open={quickEntry !== null}
        title={quickEntry ? quickEntryTitles[quickEntry] : "快捷记录"}
        onClose={closeQuickEntry}
        protectUnsavedChanges
        wide={quickEntry !== "finance"}
      >
        {quickEntry === "finance" ? (
          <FinanceEntryCreateForm
            defaultDate={today}
            isSubmitting={financeEntry.isPending}
            onSubmit={(input) => financeEntry.mutate(input, { onSuccess: closeQuickEntry })}
          />
        ) : null}
        {quickEntry === "fitness" ? (
          <FitnessLogCreateForm
            defaultDate={today}
            isSubmitting={fitnessMutations.saveLog.isPending}
            onSubmit={(input) =>
              fitnessMutations.saveLog.mutate(input, {
                onSuccess: closeQuickEntry,
              })
            }
          />
        ) : null}
        {quickEntry === "schedule" ? (
          <ScheduleCreateForm
            defaultDate={today}
            listOptions={scheduleListOptions}
            isSubmitting={scheduleMutations.create.isPending}
            onSubmit={(input) =>
              scheduleMutations.create.mutate(input, {
                onSuccess: closeQuickEntry,
              })
            }
          />
        ) : null}
        {quickEntry === "shopping" ? (
          <ShoppingItemCreateForm
            isSubmitting={shoppingMutations.create.isPending}
            onSubmit={(input) =>
              shoppingMutations.create.mutate(input, {
                onSuccess: closeQuickEntry,
              })
            }
          />
        ) : null}
      </RecordEditorDrawer>
    </section>
  );
}
