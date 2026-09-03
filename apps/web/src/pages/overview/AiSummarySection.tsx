import type { OverviewResponse, TimelineItem, TimelineSource } from "@daily-life/shared";
import { Button, Icon, Modal, Typewriter } from "animal-island-ui";
import { format, startOfWeek } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTimeline } from "@/data-provider/life";

type SummaryPeriod = "today" | "week";

interface AiSummarySectionProps {
  date: Date;
  overview: OverviewResponse | undefined;
  overviewPending: boolean;
}

interface SummaryMetric {
  label: string;
  value: string;
  hint: string;
}

interface GeneratedSummary {
  kicker: string;
  headline: string;
  message: string;
  metrics: SummaryMetric[];
  nudge: string;
  issueNumber: string;
}

const sourceLabels: Record<TimelineSource, string> = {
  finance: "财务",
  habit: "习惯",
  fitness: "运动",
  schedule: "日程",
  shopping: "购物",
  media: "书影音",
};

function countBySource(items: TimelineItem[], source: TimelineSource) {
  return items.filter((item) => item.source === source).length;
}

export function buildLifeSummary(
  period: SummaryPeriod,
  date: Date,
  overview: OverviewResponse | undefined,
  items: TimelineItem[],
): GeneratedSummary {
  const habitPlanned = overview?.habits.planned ?? 0;
  const habitCompleted = overview?.habits.completed ?? 0;
  const habitRate = habitPlanned ? Math.round((habitCompleted / habitPlanned) * 100) : 0;
  const overdue = overview?.schedule.overdue ?? 0;
  const activeDays = new Set(items.map((item) => item.date)).size;
  const sourceCounts = (Object.keys(sourceLabels) as TimelineSource[])
    .map((source) => ({ source, count: countBySource(items, source) }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count);
  const strongestSource = sourceCounts[0];
  const leadingLabel = strongestSource ? sourceLabels[strongestSource.source] : "生活";

  if (period === "week") {
    const headline =
      items.length === 0
        ? "这一周还留着一张空白页"
        : activeDays >= 5
          ? "你把这一周过得很有回声"
          : `${leadingLabel}，是这周最清晰的脚印`;
    const message = items.length
      ? `本周共收集到 ${items.length} 条生活线索，分布在 ${activeDays} 天。${leadingLabel}相关记录最集中，说明你的注意力正自然地落在这里。`
      : "暂时没有可分析的记录。现在随手记下一件小事，周末回看时就会多一条属于你的生活线索。";

    return {
      kicker: "本周生活小报",
      headline,
      message,
      metrics: [
        {
          label: "留下记录",
          value: `${items.length} 条`,
          hint: "来自本周时光档案",
        },
        { label: "活跃日", value: `${activeDays} 天`, hint: "有记录的日子" },
        {
          label: "本周主线",
          value: strongestSource ? leadingLabel : "待开启",
          hint: strongestSource ? `${strongestSource.count} 条相关记录` : "从第一条记录开始",
        },
      ],
      nudge:
        overdue > 0
          ? `下周开始前，先从 ${overdue} 项逾期日程里挑一件最重要的完成。`
          : "给下周留一个小目标就好，稳定比塞满日程更珍贵。",
      issueNumber: `${format(date, "MMdd")}-W`,
    };
  }

  const headline =
    items.length === 0 && habitCompleted === 0
      ? "今天的故事，等你写下第一笔"
      : overdue > 0
        ? "忙碌里，也别忘了给自己留一点余地"
        : habitRate >= 80
          ? "你把今天照顾得稳稳当当"
          : "细小的完成，也在让今天发光";
  const message =
    items.length > 0
      ? `今天捕捉到 ${items.length} 条生活线索，${leadingLabel}是最明显的主题。习惯完成 ${habitCompleted}/${habitPlanned}，每一条真实记录都在拼出今天的样子。`
      : `今天还没有新的时光记录，习惯完成 ${habitCompleted}/${habitPlanned}。不必追求写得完整，记下此刻最想保留的一件事就很好。`;

  return {
    kicker: "今日生活小报",
    headline,
    message,
    metrics: [
      {
        label: "习惯进度",
        value: habitPlanned ? `${habitRate}%` : "待开启",
        hint: `${habitCompleted}/${habitPlanned} 已完成`,
      },
      {
        label: "今日线索",
        value: `${items.length} 条`,
        hint: "来自各个生活模块",
      },
      {
        label: "待办提醒",
        value: `${overview?.schedule.today ?? 0} 项`,
        hint: overdue ? `${overdue} 项已经逾期` : "没有逾期负担",
      },
    ],
    nudge:
      overdue > 0
        ? "先完成最重要的一项，再决定今天还要不要继续赶路。"
        : items.length > 0
          ? "睡前写一句今天最值得保留的感受，让记录不只有数字。"
          : "从一条记录开始：一笔花费、一次运动，或一件刚刚完成的小事。",
    issueNumber: `${format(date, "MMdd")}-D`,
  };
}

export function AiSummarySection({ date, overview, overviewPending }: AiSummarySectionProps) {
  const [period, setPeriod] = useState<SummaryPeriod>("today");
  const [summary, setSummary] = useState<GeneratedSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const today = format(date, "yyyy-MM-dd");
  const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const timeline = useTimeline({ from: weekStart, to: today });
  const items = useMemo(
    () => timeline.data?.pages.flatMap((page) => page.items) ?? [],
    [timeline.data],
  );
  const dateLabel =
    period === "today"
      ? format(date, "M月d日")
      : `${format(startOfWeek(date, { weekStartsOn: 1 }), "M月d日")}—${format(date, "M月d日")}`;

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const closeModal = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setModalOpen(false);
    setSummary(null);
    setIsGenerating(false);
  };

  const generate = (nextPeriod: SummaryPeriod) => {
    if (isGenerating) return;
    const periodItems =
      nextPeriod === "today" ? items.filter((item) => item.date === today) : items;

    setPeriod(nextPeriod);
    setModalOpen(true);
    setIsGenerating(true);
    setSummary(null);
    timerRef.current = window.setTimeout(() => {
      setSummary(buildLifeSummary(nextPeriod, date, overview, periodItems));
      setIsGenerating(false);
      timerRef.current = null;
    }, 900);
  };

  const dataPending = overviewPending || timeline.isPending;

  return (
    <section
      className="relative grid min-h-44 grid-cols-1 items-center gap-[18px] overflow-visible rounded-[var(--animal-border-radius-lg)] border-[length:var(--animal-border-width)] border-dashed border-[var(--animal-primary-color-active)] bg-[var(--life-ai-panel-bg)] [background-image:radial-gradient(circle,var(--life-ai-ticket-pattern)_1px,transparent_1.5px)] [background-size:16px_16px] px-[18px] pb-[22px] pt-[78px] sm:gap-7 sm:px-[30px] sm:py-[26px] xl:grid-cols-[minmax(0,1fr)_auto]"
      aria-labelledby="ai-summary-title"
    >
      <div className="grid content-center gap-[9px] [&_h2]:m-0 [&_h2]:text-[clamp(24px,2.4vw,32px)] [&_h2]:leading-tight [&_h2]:text-[var(--animal-text-color)] [&>p]:m-0 [&>p]:max-w-[640px] [&>p]:leading-[1.65] [&>p]:text-[var(--animal-text-color-secondary)]">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--animal-surface-color)] px-3 py-[7px] text-xs font-black tracking-[0.08em] text-[var(--animal-primary-color-active)]">
          <Icon name="icon-design" size={22} />
          AI 生活观察员
        </div>
        <h2 id="ai-summary-title">把生活，印成一张小报</h2>
        <p>从已经保存的记录里，整理出重点、节奏和一个温柔的小建议。</p>
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-2.5 sm:w-[min(100%,420px)] sm:grid-cols-2 xl:min-w-[min(100%,356px)] xl:justify-self-end [&>small]:text-left [&>small]:text-[11px] [&>small]:leading-normal [&>small]:text-[var(--animal-text-color-secondary)] sm:[&>small]:col-span-2 sm:[&>small]:text-center">
        <Button
          htmlType="button"
          size="large"
          disabled={dataPending}
          icon={<Icon name="icon-camera" size={22} />}
          onClick={() => generate("today")}
        >
          {dataPending ? "正在收集生活数据" : "生成今日总结"}
        </Button>
        <Button
          htmlType="button"
          size="large"
          disabled={dataPending}
          icon={<Icon name="icon-miles" size={22} />}
          onClick={() => generate("week")}
        >
          生成本周总结
        </Button>
        <small>点击后在弹窗中查看生活票据，不会修改任何记录。</small>
      </div>

      <img
        className="pointer-events-none absolute right-2.5 top-[-42px] z-[2] h-auto w-[110px] rotate-3 select-none transition-transform motion-reduce:transition-none sm:left-[clamp(180px,30vw,280px)] sm:right-auto sm:top-[-76px] sm:w-[130px] xl:left-[clamp(220px,20vw,340px)] xl:top-[-92px] xl:w-[148px]"
        src="/brand/ip-animals-transparent/D1-sloth-left.png"
        alt=""
        aria-hidden="true"
        width={1254}
        height={1254}
        draggable="false"
      />

      <Modal
        open={modalOpen}
        title={period === "today" ? "今日生活票据" : "本周生活票据"}
        width={780}
        className="[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_*]:[-ms-overflow-style:none] [&_*]:[scrollbar-width:none] [&_*::-webkit-scrollbar]:hidden [&_div[class*='animal-body']]:items-stretch [&>div[class*='animal-modalClipped']]:px-[22px] [&>div[class*='animal-modalClipped']]:pb-6 [&>div[class*='animal-modalClipped']]:pt-[30px] sm:[&>div[class*='animal-modalClipped']]:px-11 sm:[&>div[class*='animal-modalClipped']]:pb-7 sm:[&>div[class*='animal-modalClipped']]:pt-[38px]"
        typewriter={false}
        maskClosable={!isGenerating}
        onClose={closeModal}
        footer={
          <Button htmlType="button" type="primary" disabled={isGenerating} onClick={closeModal}>
            收好这张票据
          </Button>
        }
      >
        <div
          className="mx-auto min-w-0 w-[min(100%,660px)]"
          aria-live="polite"
          aria-busy={isGenerating}
        >
          {summary ? (
            <article className="mx-auto w-[min(100%,660px)] overflow-hidden rounded-[var(--animal-border-radius-lg)] border-2 border-[var(--life-ai-ticket-line)] bg-[var(--life-ai-ticket-paper)] text-[var(--life-ai-ticket-ink)] animate-[ai-ticket-arrive_0.35s_var(--animal-motion-ease)_both] motion-reduce:animate-none">
              <div className="relative overflow-hidden bg-[var(--life-ai-ticket-paper)] [background-image:radial-gradient(circle_at_88%_12%,var(--life-ai-ticket-accent),transparent_25%),radial-gradient(circle,var(--life-ai-ticket-pattern)_1px,transparent_1.5px)] [background-size:auto,14px_14px] px-5 pb-[30px] pt-6 sm:px-[clamp(22px,5vw,46px)] [&_h3]:m-0 [&_h3]:min-h-[88px] [&_h3]:max-w-[calc(100%-102px)] [&_h3]:text-[clamp(24px,3vw,34px)] [&_h3]:leading-[1.3] [&_h3]:text-[var(--life-ai-ticket-ink)] sm:[&_h3]:min-h-[74px] sm:[&_h3]:max-w-[calc(100%-126px)]">
                <div className="flex items-center justify-between gap-4 border-b-2 border-dashed border-[var(--life-ai-ticket-line)] pb-[13px] text-[11px] font-black tracking-[0.12em] text-[var(--life-ai-ticket-muted)]">
                  <span>DAILY LIFE · AI</span>
                  <span>{dateLabel}</span>
                </div>
                <img
                  className="pointer-events-none absolute right-2.5 top-[68px] h-auto w-24 select-none sm:right-[22px] sm:top-[58px] sm:w-[clamp(94px,17vw,138px)]"
                  src="/brand/module-ip-transparent/J2-overview-owl-right.png"
                  alt=""
                  aria-hidden="true"
                  width={1254}
                  height={1254}
                  draggable="false"
                />
                <p className="mb-[5px] mt-6 text-[13px] font-black tracking-[0.16em] text-[var(--life-ai-ticket-muted)]">
                  {summary.kicker}
                </p>
                <Typewriter trigger={`${period}-${summary.issueNumber}`} speed={24}>
                  <h3>{summary.headline}</h3>
                  <p className="mb-6 mt-5 leading-[1.85] text-[var(--life-ai-ticket-ink)]">
                    {summary.message}
                  </p>
                </Typewriter>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 [&>div]:min-w-0 [&>div]:rounded-[var(--animal-border-radius-base)] [&>div]:border [&>div]:border-dashed [&>div]:border-[var(--life-ai-ticket-line)] [&>div]:bg-[color-mix(in_srgb,var(--life-ai-ticket-paper)_82%,var(--life-ai-ticket-accent))] [&>div]:p-3.5 [&_span]:block [&_span]:text-[11px] [&_span]:font-extrabold [&_span]:text-[var(--life-ai-ticket-muted)] [&_strong]:my-1 [&_strong]:block [&_strong]:text-xl [&_strong]:text-[var(--life-ai-ticket-ink)] [&_small]:block [&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap [&_small]:text-[10px] [&_small]:text-[var(--life-ai-ticket-muted)]">
                  {summary.metrics.map((metric) => (
                    <div key={metric.label}>
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                      <small>{metric.hint}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div
                className="relative h-[30px] bg-[var(--life-ai-ticket-stub)] [background-image:radial-gradient(circle,var(--life-ai-ticket-line)_1.6px,transparent_2px)] [background-position:center] [background-repeat:repeat-x] [background-size:10px_5px] before:absolute before:left-[-15px] before:top-[3px] before:z-[2] before:size-[26px] before:rounded-full before:border-2 before:border-[var(--life-ai-ticket-line)] before:bg-[var(--life-ai-panel-bg)] before:content-[''] after:absolute after:right-[-15px] after:top-[3px] after:z-[2] after:size-[26px] after:rounded-full after:border-2 after:border-[var(--life-ai-ticket-line)] after:bg-[var(--life-ai-panel-bg)] after:content-[''] [&_span]:absolute [&_span]:left-1/2 [&_span]:top-1/2 [&_span]:z-[1] [&_span]:-translate-x-1/2 [&_span]:-translate-y-1/2 [&_span]:whitespace-nowrap [&_span]:rounded-full [&_span]:border [&_span]:border-[var(--life-ai-ticket-line)] [&_span]:bg-[var(--life-ai-ticket-stub)] [&_span]:px-3 [&_span]:py-[3px] [&_span]:text-[10px] [&_span]:font-extrabold [&_span]:tracking-[0.12em] [&_span]:text-[var(--life-ai-ticket-muted)]"
                aria-hidden="true"
              >
                <span>轻轻撕下{period === "today" ? "今日" : "本周"}签语</span>
              </div>
              <div className="grid grid-cols-1 items-center gap-3 bg-[var(--life-ai-ticket-stub)] px-5 pb-7 pt-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6 sm:px-[clamp(22px,5vw,46px)] [&>div]:grid [&>div]:gap-1.5 [&_span]:text-[10px] [&_span]:font-black [&_span]:tracking-[0.14em] [&_span]:text-[var(--life-ai-ticket-muted)] [&_strong]:text-[13px] [&_strong]:leading-[1.7] [&_strong]:text-[var(--life-ai-ticket-ink)] [&_p]:m-0 [&_p]:justify-self-end [&_p]:whitespace-nowrap [&_p]:text-[10px] [&_p]:font-black [&_p]:tracking-[0.14em] [&_p]:text-[var(--life-ai-ticket-muted)] [&_b]:text-[17px] [&_b]:tracking-[0.08em] [&_b]:text-[var(--life-ai-ticket-coral)]">
                <div>
                  <span>{period === "today" ? "TODAY'S NOTE" : "THIS WEEK'S NOTE"}</span>
                  <strong>{summary.nudge}</strong>
                </div>
                <p>
                  NO. <b>{summary.issueNumber}</b>
                </p>
              </div>
            </article>
          ) : (
            <div className="grid min-h-[250px] grid-cols-[minmax(0,1fr)_96px] items-center gap-4 overflow-hidden rounded-[var(--animal-border-radius-lg)] border-2 border-[var(--life-ai-ticket-line)] bg-[var(--life-ai-ticket-paper)] [background-image:radial-gradient(circle,var(--life-ai-ticket-pattern)_1px,transparent_1.5px)] [background-size:14px_14px] px-5 py-6 sm:min-h-[300px] sm:grid-cols-[minmax(0,1fr)_160px] sm:p-8 [&>img]:col-start-2 [&>img]:row-start-1 [&>img]:w-[104px] [&>img]:animate-[ai-observer-float_0.9s_var(--animal-motion-ease)_infinite_alternate] motion-reduce:[&>img]:animate-none sm:[&>img]:w-[170px] [&>div]:col-start-1 [&>div]:row-start-1 [&>div]:grid [&>div]:gap-3 [&_span]:text-xs [&_span]:font-black [&_span]:tracking-[0.16em] [&_span]:text-[var(--life-ai-ticket-muted)] [&_strong]:max-w-[310px] [&_strong]:text-[clamp(22px,3vw,30px)] [&_strong]:leading-[1.35] [&_strong]:text-[var(--life-ai-ticket-ink)] [&_small]:text-[var(--life-ai-ticket-muted)]">
              <img
                src="/brand/module-ip-transparent/J2-overview-owl-right.png"
                alt=""
                aria-hidden="true"
                width={1254}
                height={1254}
                draggable="false"
              />
              <div>
                <span>AI 生活观察员正在阅读</span>
                <strong>把零散记录装订成一张小报…</strong>
                <small>{dateLabel} · 通常只需片刻</small>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </section>
  );
}
