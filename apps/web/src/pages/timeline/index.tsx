import type { TimelineItem, TimelineSource } from "@daily-life/shared";
import { Button, Card, DatePicker, Divider, Icon, Select, Title } from "animal-island-ui";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTimeline } from "@/data-provider/life";

const sourceOptions = [
  { key: "all", label: "全部记录" },
  { key: "finance", label: "财务" },
  { key: "habit", label: "习惯" },
  { key: "fitness", label: "健身" },
  { key: "schedule", label: "日程" },
  { key: "shopping", label: "待买" },
  { key: "media", label: "书影音" },
];

const sourceLabels: Record<TimelineSource, string> = {
  finance: "财务",
  habit: "习惯",
  fitness: "健身",
  schedule: "日程",
  shopping: "待买",
  media: "书影音",
};

const sourceIcons = {
  finance: "icon-miles",
  habit: "icon-design",
  fitness: "icon-helicopter",
  schedule: "icon-map",
  shopping: "icon-shopping",
  media: "icon-critterpedia",
} as const;

export function Component() {
  const [source, setSource] = useState("all");
  const [range, setRange] = useState<[string, string] | null>(null);
  const timeline = useTimeline({
    from: range?.[0],
    to: range?.[1],
    source: source === "all" ? undefined : (source as TimelineSource),
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

  return (
    <section className="grid gap-7">
      <header className="flex flex-col items-start justify-between gap-6 [&_h1]:my-2 [&_h1]:font-sans [&_h1]:text-[clamp(30px,4vw,46px)] [&_h1]:leading-[1.18] [&_h1]:text-[var(--animal-text-color)] [&_p]:m-0 [&_p]:max-w-[680px] [&_p]:text-island-muted sm:flex-row sm:items-end">
        <div>
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
            时光档案
          </p>
          <h1>按日期折叠的生活记录</h1>
          <p>所有有效记录由来源模块即时映射，不会复制成第二份事实。</p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Select options={sourceOptions} value={source} onChange={setSource} />
          <DatePicker
            range
            allowClear
            value={range}
            onChange={(value) => setRange(Array.isArray(value) ? value : null)}
          />
        </div>
      </header>

      {timeline.isPending ? (
        <Card className="grid min-h-[140px] w-full place-items-center px-6 py-[42px] text-center text-[var(--animal-text-color-secondary)]">
          正在整理生活轨迹…
        </Card>
      ) : null}
      {!timeline.isPending && groups.length === 0 ? (
        <Card
          type="dashed"
          className="grid min-h-[140px] w-full place-items-center px-6 py-[42px] text-center text-[var(--animal-text-color-secondary)]"
        >
          这个范围还没有记录
        </Card>
      ) : null}

      <div className="grid gap-6">
        {groups.map(([date, items], index) => (
          <section className="flex flex-col items-start gap-3" key={date}>
            <Title color={index === 0 ? "app-yellow" : "default"}>{date}</Title>
            <Card
              className={`w-full px-[22px] py-3 sm:px-7 ${
                index === 0 ? "relative overflow-visible" : ""
              }`}
            >
              {index === 0 ? (
                <img
                  className="pointer-events-none absolute right-3.5 top-[-54px] z-[2] h-auto w-[82px] select-none sm:right-6 sm:top-[-70px] sm:w-[104px]"
                  src="/brand/module-ip-transparent/H2-timeline-tree-ring-right.png"
                  alt=""
                  aria-hidden="true"
                  width={1254}
                  height={1254}
                />
              ) : null}
              {items.map((item, itemIndex) => (
                <div
                  className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-[18px] py-[18px] [contain-intrinsic-size:100px] [content-visibility:auto] sm:grid-cols-[auto_minmax(0,1fr)_auto] [&>div>span]:block [&>div>span]:text-[length:var(--animal-font-size-sm)] [&>div>span]:font-extrabold [&>div>span]:text-[var(--animal-primary-color-active)] [&_strong]:my-[3px] [&_strong]:block [&_p]:m-0 [&_p]:text-[var(--animal-text-color-secondary)] [&>a]:col-start-2 [&>a]:font-extrabold [&>a]:text-[var(--animal-primary-color-active)] [&>a]:no-underline sm:[&>a]:col-auto"
                  key={item.id}
                >
                  <Icon name={sourceIcons[item.source]} size={34} />
                  <div>
                    <span>{sourceLabels[item.source]}</span>
                    <strong>{item.title}</strong>
                    <p>{item.summary}</p>
                  </div>
                  <Link to={item.to}>查看来源</Link>
                  {itemIndex < items.length - 1 ? (
                    <Divider
                      className="absolute bottom-[-6px] left-[-22px] right-[-22px] sm:left-[-28px] sm:right-[-28px]"
                      type="dashed-brown"
                    />
                  ) : null}
                </div>
              ))}
            </Card>
          </section>
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
