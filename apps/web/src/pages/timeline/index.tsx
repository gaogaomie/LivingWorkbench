import {
  type TimelineItem,
  type TimelineSource,
  timelineSourceLabels,
  timelineSourceSchema,
} from "@daily-life/shared";
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Form,
  FormItem,
  Icon,
  Input,
  Select,
} from "animal-island-ui";
import { format } from "date-fns";
import { type KeyboardEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTimeline } from "@/data-provider/life";
import { formatLocalDate, formatMonth } from "@/presentation/domain-formatters";
import {
  readTimelineFilters,
  shiftTimelineMonth,
  type TimelinePeriod,
  timelineDateRange,
} from "./timeline-filters";

const sourceOptions = [
  { key: "all", label: "全部来源" },
  ...Object.entries(timelineSourceLabels).map(([key, label]) => ({
    key,
    label,
  })),
];

const sourceIcons = {
  finance: "icon-miles",
  habit: "icon-design",
  fitness: "icon-helicopter",
  schedule: "icon-map",
  shopping: "icon-shopping",
  media: "icon-critterpedia",
} as const;

function KeywordSearch({
  initialValue,
  onSubmit,
}: {
  initialValue: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const search = () => onSubmit(value.trim());
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    search();
  };

  return (
    <search className="min-w-0 flex-1">
      <div className="flex gap-2">
        <Input
          aria-label="搜索档案关键词"
          allowClear
          maxLength={50}
          placeholder="搜索标题或内容"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button htmlType="button" onClick={search}>
          搜索
        </Button>
      </div>
    </search>
  );
}

function ShareReviewButton({ shareUrl }: { shareUrl: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button htmlType="button" onClick={copy}>
        {status === "copied" ? "链接已复制" : "复制回顾链接"}
      </Button>
      <span aria-live="polite" className="text-sm text-island-muted">
        {status === "error" ? "复制失败，请从地址栏复制" : ""}
      </span>
    </div>
  );
}

function TimelineDayGroup({
  date,
  items,
  defaultExpanded,
}: {
  date: string;
  items: TimelineItem[];
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = `timeline-day-${date}`;

  return (
    <Card className="w-full overflow-hidden px-0 py-0">
      <button
        aria-controls={panelId}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center justify-between gap-4 border-0 bg-transparent px-6 py-5 text-left text-[var(--animal-text-color)] transition-colors hover:bg-[var(--animal-primary-color-bg)]"
        type="button"
        onClick={() => setExpanded((value) => !value)}
      >
        <strong>{formatLocalDate(date)}</strong>
        <span className="text-sm text-island-muted">{items.length} 条记录</span>
      </button>
      {expanded ? (
        <section aria-label={`${formatLocalDate(date)}记录`} id={panelId}>
          <div className="px-7 pb-5">
            {items.map((item, itemIndex) => (
              <div
                className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-[18px] py-[18px] sm:grid-cols-[auto_minmax(0,1fr)_auto] [&>div>span]:block [&>div>span]:text-[length:var(--animal-font-size-sm)] [&>div>span]:font-extrabold [&>div>span]:text-[var(--animal-primary-color-active)] [&_strong]:my-[3px] [&_strong]:block [&_p]:m-0 [&_p]:text-[var(--animal-text-color-secondary)] [&>a]:col-start-2 [&>a]:font-extrabold [&>a]:text-[var(--animal-primary-color-active)] [&>a]:no-underline sm:[&>a]:col-auto"
                key={item.id}
              >
                <Icon name={sourceIcons[item.source]} size={34} />
                <div>
                  <span>{timelineSourceLabels[item.source]}</span>
                  <strong>{item.title}</strong>
                  <p>{item.summary}</p>
                </div>
                <Link to={item.to}>查看来源</Link>
                {itemIndex < items.length - 1 ? (
                  <Divider className="absolute bottom-[-6px] left-0 right-0" type="dashed-brown" />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </Card>
  );
}

export function Component() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readTimelineFilters(searchParams, today.slice(0, 7));
  const [from, to] = timelineDateRange(filters);
  const timeline = useTimeline({
    from,
    to,
    source: filters.source === "all" ? undefined : filters.source,
    keyword: filters.keyword || undefined,
  });
  const groups = useMemo(() => {
    const result = new Map<string, TimelineItem[]>();
    for (const item of timeline.data?.pages.flatMap((page) => page.items) ?? []) {
      const group = result.get(item.date) ?? [];
      group.push(item);
      result.set(item.date, group);
    }
    return [...result.entries()];
  }, [timeline.data]);
  const summary = timeline.data?.pages[0]?.summary;

  const updateSearch = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const changePeriod = (period: TimelinePeriod) => {
    updateSearch({
      period,
      from: period === "custom" ? (filters.range?.[0] ?? from) : null,
      to: period === "custom" ? (filters.range?.[1] ?? to) : null,
    });
  };

  const changeSource = (value: string) => {
    const parsed = timelineSourceSchema.safeParse(value);
    updateSearch({ source: parsed.success ? parsed.data : null });
  };

  const shareSearch = new URLSearchParams(searchParams);
  shareSearch.set("period", filters.period);
  if (filters.period === "month") shareSearch.set("month", filters.month);
  if (filters.period === "year") shareSearch.set("year", filters.year);
  if (filters.period === "custom") {
    shareSearch.set("from", from);
    shareSearch.set("to", to);
  }
  const shareUrl = `${window.location.origin}${window.location.pathname}?${shareSearch.toString()}`;
  const periodLabel =
    filters.period === "month"
      ? formatMonth(filters.month)
      : filters.period === "year"
        ? `${filters.year} 年`
        : `${from} 至 ${to}`;

  return (
    <section className="grid gap-7">
      <header className="flex flex-col items-start justify-between gap-6 [&_h1]:my-2 [&_h1]:font-sans [&_h1]:text-[clamp(30px,4vw,46px)] [&_h1]:leading-[1.18] [&_h1]:text-[var(--animal-text-color)] [&_p]:m-0 [&_p]:max-w-[680px] [&_p]:text-island-muted lg:flex-row lg:items-end">
        <div>
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
            时光档案
          </p>
          <h1>把生活翻回某一天</h1>
          <p>按时间、来源和关键词找到记录，也可以复制链接分享这一段回顾。</p>
        </div>
      </header>

      {!timeline.isPending && !timeline.isError && summary ? (
        <Card
          aria-label="生活回顾"
          role="region"
          color="app-yellow"
          className="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-7"
        >
          <div>
            <p className="m-0 text-sm font-extrabold opacity-80">{periodLabel} · 生活回顾</p>
            <p className="my-2 text-2xl font-black">
              留下 {summary.totalRecords} 条记录，点亮 {summary.activeDays} 天
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold">
              {(Object.keys(timelineSourceLabels) as TimelineSource[])
                .filter((source) => summary.sourceCounts[source] > 0)
                .map((source) => (
                  <span key={source}>
                    {timelineSourceLabels[source]} {summary.sourceCounts[source]}
                  </span>
                ))}
            </div>
          </div>
          <ShareReviewButton key={shareUrl} shareUrl={shareUrl} />
        </Card>
      ) : null}

      <Card aria-label="档案筛选" role="region" className="w-full px-6 py-6 sm:px-8 sm:py-7">
        <Form layout="vertical">
          <div className="grid grid-cols-1 items-end gap-x-6 gap-y-5 md:grid-cols-2 2xl:grid-cols-12">
            <FormItem className="min-w-0 2xl:col-span-3" label="回顾周期">
              <fieldset className="m-0 grid grid-cols-3 gap-2 border-0 p-0 [&>button]:w-full">
                <legend className="sr-only">回顾周期</legend>
                {(["month", "year", "custom"] as const).map((period) => (
                  <Button
                    htmlType="button"
                    key={period}
                    type={filters.period === period ? "primary" : "default"}
                    aria-pressed={filters.period === period}
                    onClick={() => changePeriod(period)}
                  >
                    {
                      (
                        {
                          month: "按月",
                          year: "按年",
                          custom: "自定义",
                        } as const
                      )[period]
                    }
                  </Button>
                ))}
              </fieldset>
            </FormItem>

            <FormItem
              className="min-w-0 2xl:col-span-4"
              label={
                filters.period === "month"
                  ? "回顾月份"
                  : filters.period === "year"
                    ? "回顾年份"
                    : "日期范围"
              }
            >
              {filters.period === "month" ? (
                <div className="flex min-w-0 items-center gap-2 [&_.animal-date-picker]:min-w-0 [&_.animal-date-picker]:flex-1">
                  <Button
                    aria-label="上一个月"
                    htmlType="button"
                    onClick={() =>
                      updateSearch({
                        month: shiftTimelineMonth(filters.month, -1),
                      })
                    }
                  >
                    上月
                  </Button>
                  <DatePicker
                    aria-label="选择回顾月份"
                    picker="month"
                    value={filters.month}
                    onChange={(value) => {
                      if (typeof value === "string") updateSearch({ month: value });
                    }}
                  />
                  <Button
                    aria-label="下一个月"
                    htmlType="button"
                    onClick={() =>
                      updateSearch({
                        month: shiftTimelineMonth(filters.month, 1),
                      })
                    }
                  >
                    下月
                  </Button>
                </div>
              ) : null}
              {filters.period === "year" ? (
                <div className="grid grid-cols-[auto_minmax(80px,1fr)_auto] items-center gap-3">
                  <Button
                    aria-label="上一年"
                    htmlType="button"
                    onClick={() => updateSearch({ year: String(Number(filters.year) - 1) })}
                  >
                    上一年
                  </Button>
                  <strong className="min-w-20 text-center text-lg">{filters.year} 年</strong>
                  <Button
                    aria-label="下一年"
                    htmlType="button"
                    onClick={() => updateSearch({ year: String(Number(filters.year) + 1) })}
                  >
                    下一年
                  </Button>
                </div>
              ) : null}
              {filters.period === "custom" ? (
                <DatePicker
                  className="w-full"
                  aria-label="选择回顾日期范围"
                  range
                  value={[from, to]}
                  onChange={(value) => {
                    if (Array.isArray(value)) updateSearch({ from: value[0], to: value[1] });
                  }}
                />
              ) : null}
            </FormItem>

            <FormItem className="min-w-0 2xl:col-span-2" label="记录来源">
              <Select
                aria-label="筛选记录来源"
                options={sourceOptions}
                value={filters.source}
                onChange={changeSource}
              />
            </FormItem>
            <FormItem className="min-w-0 2xl:col-span-3" label="关键词">
              <div className="flex min-w-0 items-center gap-2">
                <KeywordSearch
                  key={filters.keyword}
                  initialValue={filters.keyword}
                  onSubmit={(keyword) => updateSearch({ q: keyword || null })}
                />
                {filters.keyword || filters.source !== "all" ? (
                  <Button htmlType="button" onClick={() => updateSearch({ q: null, source: null })}>
                    清除
                  </Button>
                ) : null}
              </div>
            </FormItem>
          </div>
        </Form>
      </Card>

      {timeline.isPending ? (
        <Card className="grid min-h-[140px] w-full place-items-center px-6 py-[42px] text-center text-[var(--animal-text-color-secondary)]">
          正在整理生活轨迹…
        </Card>
      ) : null}
      {timeline.isError ? (
        <Card
          type="dashed"
          className="grid min-h-[140px] place-items-center gap-3 px-6 py-8 text-center"
        >
          <p className="m-0 text-island-muted">档案暂时没有整理成功，请稍后重试。</p>
          <Button
            htmlType="button"
            loading={timeline.isFetching}
            onClick={() => timeline.refetch()}
          >
            重新加载
          </Button>
        </Card>
      ) : null}
      {!timeline.isPending && !timeline.isError && groups.length === 0 ? (
        <Card
          type="dashed"
          className="grid min-h-[140px] w-full place-items-center px-6 py-[42px] text-center text-[var(--animal-text-color-secondary)]"
        >
          这个范围还没有匹配的记录
        </Card>
      ) : null}

      <div className="grid gap-4">
        {groups.map(([date, items], index) => (
          <TimelineDayGroup date={date} defaultExpanded={index === 0} key={date} items={items} />
        ))}
      </div>
      {timeline.hasNextPage ? (
        <Button
          htmlType="button"
          block
          loading={timeline.isFetchingNextPage}
          onClick={() => timeline.fetchNextPage()}
        >
          继续翻看更早的记录
        </Button>
      ) : null}
    </section>
  );
}
