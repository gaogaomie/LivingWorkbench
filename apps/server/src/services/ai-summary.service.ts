import { createHash } from "node:crypto";
import type {
  AiSummaryPeriod,
  AiSummaryResponse,
  AiSummaryStyle,
  OverviewResponse,
  TimelineItem,
  TimelineSource,
} from "@daily-life/shared";
import { timelineSourceSchema } from "@daily-life/shared";
import type {
  AiModelInterpretation,
  AiSummaryProvider,
  AiSummarySnapshot,
} from "../ai/ai-summary.provider";
import type { OverviewRepository, TimelineRepository } from "../repositories/life.repository";

const sourceLabels: Record<TimelineSource, string> = {
  finance: "财务",
  habit: "习惯",
  fitness: "运动",
  schedule: "日程",
  shopping: "购物",
  media: "书影音",
};

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function weekStart(date: string): string {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return shiftDate(date, day === 0 ? -6 : 1 - day);
}

function buildSnapshot(
  period: AiSummaryPeriod,
  date: string,
  overview: OverviewResponse,
  items: TimelineItem[],
): AiSummarySnapshot {
  const sourceCounts: Partial<Record<TimelineSource, number>> = {};
  for (const item of items) sourceCounts[item.source] = (sourceCounts[item.source] ?? 0) + 1;
  return {
    period,
    from: period === "today" ? date : weekStart(date),
    to: date,
    overview: {
      expenseFen: overview.finance.expenseFen,
      financeEntryCount: overview.finance.entryCount,
      habitsPlanned: overview.habits.planned,
      habitsCompleted: overview.habits.completed,
      todosToday: overview.schedule.today,
      todosOverdue: overview.schedule.overdue,
    },
    activeDays: new Set(items.map((item) => item.date)).size,
    sourceCounts,
    events: items.slice(0, 20).map((item) => ({
      source: item.source,
      date: item.date,
      title: item.title,
      recordPath: item.to,
    })),
  };
}

function buildRuleInterpretation(snapshot: AiSummarySnapshot): AiModelInterpretation {
  const totalEvents = snapshot.events.length;
  const habitRate = snapshot.overview.habitsPlanned
    ? Math.round((snapshot.overview.habitsCompleted / snapshot.overview.habitsPlanned) * 100)
    : 0;
  return {
    headline:
      totalEvents === 0
        ? "这一页还在等第一条生活记录"
        : snapshot.overview.todosOverdue > 0
          ? "今天有进展，也有一件事值得先照顾"
          : "零散的小事正在拼出清晰的生活轨迹",
    summary:
      snapshot.period === "week"
        ? `本周在 ${snapshot.activeDays} 天里留下 ${totalEvents} 条可追溯记录。`
        : `今天留下 ${totalEvents} 条可追溯记录，习惯完成度为 ${habitRate}%。`,
    affirmation:
      totalEvents > 0 ? "你已经把真实发生的小事留了下来。" : "愿意打开工作台，就是开始。",
    attention:
      snapshot.overview.todosOverdue > 0
        ? `当前有 ${snapshot.overview.todosOverdue} 项逾期日程。`
        : null,
    nextStep:
      snapshot.overview.todosOverdue > 0
        ? "先挑一项最重要的逾期日程处理。"
        : "再记下一件今天最想保留的小事。",
  };
}

function buildMetrics(snapshot: AiSummarySnapshot): AiSummaryResponse["metrics"] {
  const habitRate = snapshot.overview.habitsPlanned
    ? Math.round((snapshot.overview.habitsCompleted / snapshot.overview.habitsPlanned) * 100)
    : 0;
  return snapshot.period === "week"
    ? [
        { label: "留下记录", value: `${snapshot.events.length} 条`, hint: "来自本周时光档案" },
        { label: "活跃日", value: `${snapshot.activeDays} 天`, hint: "有记录的日子" },
        {
          label: "来源模块",
          value: `${Object.keys(snapshot.sourceCounts).length} 个`,
          hint: "只统计已保存记录",
        },
      ]
    : [
        {
          label: "习惯进度",
          value: snapshot.overview.habitsPlanned ? `${habitRate}%` : "待开启",
          hint: `${snapshot.overview.habitsCompleted}/${snapshot.overview.habitsPlanned} 已完成`,
        },
        { label: "今日线索", value: `${snapshot.events.length} 条`, hint: "来自各生活模块" },
        {
          label: "待办提醒",
          value: `${snapshot.overview.todosToday} 项`,
          hint: snapshot.overview.todosOverdue
            ? `${snapshot.overview.todosOverdue} 项逾期`
            : "没有逾期负担",
        },
      ];
}

function buildFacts(snapshot: AiSummarySnapshot): AiSummaryResponse["facts"] {
  const eventFacts = snapshot.events.slice(0, 4).map((event) => ({
    text: `${event.date} · ${sourceLabels[event.source]} · ${event.title}`,
    source: event.source,
    recordPath: event.recordPath,
  }));
  return eventFacts.length
    ? eventFacts
    : [
        {
          text: `${snapshot.from} 至 ${snapshot.to} 暂无可用于解读的有效记录。`,
          source: null,
          recordPath: null,
        },
      ];
}

export interface AiSummaryServiceResult {
  response: AiSummaryResponse;
  providerFailure: boolean;
}

export class AiSummaryService {
  constructor(
    private readonly overview: OverviewRepository,
    private readonly timeline: TimelineRepository,
    private readonly provider: AiSummaryProvider | null,
  ) {}

  async generate(input: {
    userId: string;
    period: AiSummaryPeriod;
    date: string;
    style: AiSummaryStyle;
  }): Promise<AiSummaryServiceResult> {
    const from = input.period === "today" ? input.date : weekStart(input.date);
    const overview = this.overview.get(input.userId, input.date);
    const items = this.timeline.getPage(input.userId, {
      from,
      to: input.date,
      limit: 50,
    }).items;
    const snapshot = buildSnapshot(input.period, input.date, overview, items);
    let interpretation = buildRuleInterpretation(snapshot);
    let model: string | null = null;
    let provider: AiSummaryResponse["provider"] = "rules";
    let fallbackReason: string | null = "AI 尚未配置，已使用本地规则生成摘要。";
    let providerFailure = false;

    if (this.provider) {
      try {
        const generated = await this.provider.generate({
          snapshot,
          style: input.style,
          safetyIdentifier: createHash("sha256").update(input.userId).digest("hex"),
        });
        interpretation = generated.interpretation;
        model = generated.model;
        provider = this.provider.kind;
        fallbackReason = null;
      } catch {
        providerFailure = true;
        fallbackReason = "AI 服务暂时不可用，已使用本地规则生成摘要。";
      }
    }

    return {
      providerFailure,
      response: {
        period: input.period,
        style: input.style,
        provider,
        model,
        generatedAt: new Date().toISOString(),
        dataThrough: input.date,
        kicker: input.period === "today" ? "今日生活小报" : "本周生活小报",
        headline: interpretation.headline,
        summary: interpretation.summary,
        facts: buildFacts(snapshot),
        affirmation: interpretation.affirmation,
        attention: interpretation.attention,
        nextStep: interpretation.nextStep,
        metrics: buildMetrics(snapshot),
        sourceLabels: Object.keys(snapshot.sourceCounts).flatMap((source) => {
          const parsed = timelineSourceSchema.safeParse(source);
          return parsed.success ? [parsed.data] : [];
        }),
        issueNumber: `${input.date.replaceAll("-", "").slice(4)}-${input.period === "today" ? "D" : "W"}`,
        fallbackReason,
      },
    };
  }
}
