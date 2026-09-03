import { Button, Card } from "animal-island-ui";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import dailyAnimals from "@/assets/daily-animals.png";
import { useOverview } from "@/data-provider/life";
import { useServerHealth } from "@/data-provider/queries/use-server-health";
import { AiSummarySection } from "./AiSummarySection";

const quickActions = [
  { label: "记一笔", to: "/finance", primary: true },
  { label: "排日程", to: "/schedule", primary: false },
  { label: "记体重", to: "/fitness", primary: false },
  { label: "待买物品", to: "/shopping", primary: false },
];
const moneyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 2,
});

export function OverviewPage() {
  const health = useServerHealth();
  const navigate = useNavigate();
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const overview = useOverview(today);

  return (
    <section className="grid gap-7">
      <header className="grid items-start gap-4 [&_h1]:my-2 [&_h1]:font-sans [&_h1]:text-[clamp(30px,4vw,46px)] [&_h1]:leading-[1.18] [&_h1]:text-[var(--animal-text-color)] [&_p]:m-0 [&_p]:max-w-[680px] [&_p]:text-island-muted sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-6">
        <div className="min-w-0">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
            日常集 · 岛上今日
          </p>
          <h1>欢迎回岛，今天也慢慢来</h1>
          <p>这里收着你的账目、习惯、安排和喜欢。每记下一点，生活小岛就更完整一点。</p>
        </div>
        <div className="flex items-end gap-3 justify-self-start sm:justify-self-end">
          <img
            className="h-auto w-[88px] select-none object-contain sm:w-[112px]"
            src={dailyAnimals}
            alt=""
            aria-hidden="true"
            width={1952}
            height={1266}
            draggable="false"
          />
          <div
            className={`flex w-fit flex-none items-center gap-2 rounded-full border px-[13px] py-[9px] text-[13px] ${
              health.isError
                ? "border-[var(--animal-error-color)] bg-[var(--animal-error-surface)] text-[var(--animal-error-color-active)] [&_span]:bg-[var(--animal-error-color)]"
                : "border-[var(--animal-success-color)] bg-[var(--animal-success-surface)] text-[var(--animal-success-color-active)] [&_span]:bg-[var(--animal-success-color)]"
            } [&_span]:size-2 [&_span]:rounded-full`}
          >
            <span aria-hidden="true" />
            {health.isPending ? "正在连接云端" : health.isError ? "云端暂不可用" : "云端服务正常"}
          </div>
        </div>
      </header>

      <AiSummarySection date={now} overview={overview.data} overviewPending={overview.isPending} />

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-12">
        <Card
          className="group relative col-span-1 min-h-[260px] overflow-hidden p-8 sm:col-span-12 xl:col-span-5 [&>:not(img)]:relative [&>:not(img)]:z-[1]"
          color="warm-peach-pink"
        >
          <img
            className="pointer-events-none absolute right-[18px] top-[20px] z-0 h-auto w-[88px] select-none transition-transform motion-reduce:transition-none sm:w-[clamp(92px,8vw,120px)] sm:group-hover:-translate-x-0.5 sm:group-hover:-translate-y-0.5 sm:group-hover:-rotate-2"
            src="/brand/ip-animals-transparent/C1-snail-left.png"
            alt=""
            aria-hidden="true"
            width={1254}
            height={1254}
            draggable="false"
          />
          <p className="m-0 text-base font-extrabold leading-[1.4] tracking-[0.06em] text-[var(--animal-island-text-on-peach)]">
            今日生活指数
          </p>
          <strong className="my-3 block text-7xl leading-none text-white">—</strong>
          <p className="mt-4 max-w-[calc(100%-92px)] leading-[1.7] text-white sm:max-w-[min(380px,calc(100%-112px))]">
            完成第一条有效记录后，这里会显示透明、可解释的生活指数。
          </p>
        </Card>

        <Card className="relative col-span-1 overflow-visible p-[30px] sm:col-span-12 xl:col-span-7 [&_h2]:mb-5 [&_h2]:mt-0 [&_h2]:text-xl">
          <h2>记下一件小事</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&_.animal-button]:min-h-[58px]">
            {quickActions.map((action) => (
              <Button
                key={action.to}
                htmlType="button"
                type={action.primary ? "primary" : "default"}
                size="large"
                block
                onClick={() => navigate(action.to)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="col-span-1 p-6 sm:col-span-4 [&_p]:text-[var(--animal-text-color-secondary)] [&_small]:text-[var(--animal-text-color-secondary)] [&_strong]:my-1.5 [&_strong]:block [&_strong]:text-[34px]">
          <p>本月支出</p>
          <strong>
            {overview.data ? moneyFormatter.format(overview.data.finance.expenseFen / 100) : "—"}
          </strong>
          <small>{overview.data?.finance.entryCount ?? 0} 笔账目</small>
        </Card>
        <Card className="col-span-1 p-6 sm:col-span-4 [&_p]:text-[var(--animal-text-color-secondary)] [&_small]:text-[var(--animal-text-color-secondary)] [&_strong]:my-1.5 [&_strong]:block [&_strong]:text-[34px]">
          <p>今日习惯</p>
          <strong>
            {overview.data
              ? `${overview.data.habits.completed}/${overview.data.habits.planned}`
              : "—"}
          </strong>
          <small>完成后即时更新</small>
        </Card>
        <Card className="col-span-1 p-6 sm:col-span-4 [&_p]:text-[var(--animal-text-color-secondary)] [&_small]:text-[var(--animal-text-color-secondary)] [&_strong]:my-1.5 [&_strong]:block [&_strong]:text-[34px]">
          <p>今日待办</p>
          <strong>{overview.data?.schedule.today ?? "—"}</strong>
          <small>{overview.data?.schedule.overdue ?? 0} 项逾期</small>
        </Card>

        <Card
          className="col-span-1 min-h-[150px] p-7 sm:col-span-12 [&_h2]:mb-5 [&_h2]:mt-0 [&_h2]:text-xl [&_p]:text-[var(--animal-text-color-secondary)]"
          type="dashed"
        >
          <h2>最近记录</h2>
          {overview.data?.recent.length ? (
            <div className="grid gap-2.5 [&_p]:m-0 [&_p]:grid [&_p]:grid-cols-[minmax(0,1fr)_auto_auto] [&_p]:gap-[18px] [&_p]:border-b [&_p]:border-dashed [&_p]:border-[var(--animal-border-color-light)] [&_p]:py-2.5 [&_p:last-child]:border-b-0">
              {overview.data.recent.map((item) => (
                <p key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.date}</span>
                  <span>{item.summary}</span>
                </p>
              ))}
            </div>
          ) : (
            <p>保存任一生活记录后，它会出现在这里并进入时光档案。</p>
          )}
        </Card>
      </div>
    </section>
  );
}
