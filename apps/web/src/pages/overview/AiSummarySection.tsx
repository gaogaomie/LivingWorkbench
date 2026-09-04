import {
  type AiSummaryPeriod,
  type AiSummaryResponse,
  type AiSummaryStyle,
  aiSummaryStyleSchema,
  timelineSourceLabels,
} from "@daily-life/shared";
import { Button, Checkbox, Icon, Modal, Radio, Tag, Typewriter } from "animal-island-ui";
import { format, startOfWeek } from "date-fns";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useGenerateAiSummary } from "@/data-provider/ai";
import { formatLocalDate } from "@/presentation/domain-formatters";
import modalStyles from "./ai-summary-modal.module.css";

interface AiSummarySectionProps {
  date: Date;
}

const styleOptions = [
  { label: "温柔", value: "gentle" },
  { label: "简洁", value: "concise" },
  { label: "数据感", value: "data" },
];

const consentOption = [
  {
    label: "我同意将本次摘要所需的脱敏记录发送给 AI 服务",
    value: "consent",
  },
];

function SummaryTicket({ summary, dateLabel }: { summary: AiSummaryResponse; dateLabel: string }) {
  const providerLabel =
    summary.provider === "deepseek" ? `DeepSeek · ${summary.model ?? "AI"}` : "本地规则降级";

  return (
    <article className="mx-auto w-[min(100%,660px)] overflow-hidden rounded-[var(--animal-border-radius-lg)] border-2 border-[var(--life-ai-ticket-line)] bg-[var(--life-ai-ticket-paper)] text-[var(--life-ai-ticket-ink)] animate-[ai-ticket-arrive_0.35s_var(--animal-motion-ease)_both] motion-reduce:animate-none">
      <div className="relative overflow-hidden bg-[var(--life-ai-ticket-paper)] [background-image:radial-gradient(circle_at_88%_12%,var(--life-ai-ticket-accent),transparent_25%),radial-gradient(circle,var(--life-ai-ticket-pattern)_1px,transparent_1.5px)] [background-size:auto,14px_14px] px-5 pb-[30px] pt-6 sm:px-[clamp(22px,5vw,46px)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-[var(--life-ai-ticket-line)] pb-[13px] text-[11px] font-black tracking-[0.1em] text-[var(--life-ai-ticket-muted)]">
          <span>DAILY LIFE · AI</span>
          <span>{dateLabel}</span>
          <Tag
            size="small"
            variant="soft"
            color={summary.provider === "deepseek" ? "app-green" : "app-yellow"}
          >
            {providerLabel}
          </Tag>
        </div>
        <img
          className="pointer-events-none absolute right-2.5 top-[78px] h-auto w-24 select-none sm:right-[22px] sm:w-[clamp(94px,17vw,128px)]"
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
        <Typewriter trigger={`${summary.period}-${summary.issueNumber}`} speed={24}>
          <h3 className="m-0 min-h-[88px] max-w-[calc(100%-102px)] text-[clamp(24px,3vw,34px)] leading-[1.3] text-[var(--life-ai-ticket-ink)] sm:min-h-[74px] sm:max-w-[calc(100%-126px)]">
            {summary.headline}
          </h3>
          <p className="mb-6 mt-5 leading-[1.85]">{summary.summary}</p>
        </Typewriter>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {summary.metrics.map((metric) => (
            <div
              key={metric.label}
              className="min-w-0 rounded-[var(--animal-border-radius-base)] border border-dashed border-[var(--life-ai-ticket-line)] bg-[color-mix(in_srgb,var(--life-ai-ticket-paper)_82%,var(--life-ai-ticket-accent))] p-3.5"
            >
              <span className="block text-[11px] font-extrabold text-[var(--life-ai-ticket-muted)]">
                {metric.label}
              </span>
              <strong className="my-1 block text-xl">{metric.value}</strong>
              <small className="block text-[10px] text-[var(--life-ai-ticket-muted)]">
                {metric.hint}
              </small>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 border-t border-dashed border-[var(--life-ai-ticket-line)] pt-4">
          <p className="m-0 text-sm leading-7">
            <strong>值得肯定：</strong>
            {summary.affirmation}
          </p>
          {summary.attention ? (
            <p className="m-0 text-sm leading-7">
              <strong>值得留意：</strong>
              {summary.attention}
            </p>
          ) : null}
          <p className="m-0 text-sm leading-7">
            <strong>下一小步：</strong>
            {summary.nextStep}
          </p>
        </div>

        <div className="mt-5 rounded-[var(--animal-border-radius-base)] bg-[var(--life-ai-ticket-stub)] p-4">
          <strong className="text-xs tracking-[0.08em] text-[var(--life-ai-ticket-muted)]">
            解读依据
          </strong>
          <ul className="mb-0 mt-2 grid gap-2 pl-5 text-sm leading-6">
            {summary.facts.map((fact) => (
              <li key={`${fact.source ?? "overview"}-${fact.text}`}>
                {fact.recordPath ? <Link to={fact.recordPath}>{fact.text}</Link> : fact.text}
              </li>
            ))}
          </ul>
          <p className="mb-0 mt-3 text-xs text-[var(--life-ai-ticket-muted)]">
            来源：
            {summary.sourceLabels.length
              ? summary.sourceLabels.map((source) => timelineSourceLabels[source]).join("、")
              : "生活概览"}
          </p>
        </div>

        {summary.fallbackReason ? (
          <p className="mb-0 mt-4 rounded-[var(--animal-border-radius-base)] bg-[var(--animal-warning-surface)] p-3 text-sm text-[var(--animal-warning-color-active)]">
            {summary.fallbackReason}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--life-ai-ticket-stub)] px-5 py-4 text-[10px] font-black tracking-[0.12em] text-[var(--life-ai-ticket-muted)] sm:px-[clamp(22px,5vw,46px)]">
        <span>数据截至 {formatLocalDate(summary.dataThrough)}</span>
        <span>NO. {summary.issueNumber}</span>
      </div>
    </article>
  );
}

export function AiSummarySection({ date }: AiSummarySectionProps) {
  const [period, setPeriod] = useState<AiSummaryPeriod>("today");
  const [style, setStyle] = useState<AiSummaryStyle>("gentle");
  const [consent, setConsent] = useState<Array<string | number>>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const summaryTrigger = useRef<HTMLButtonElement | null>(null);
  const generateSummary = useGenerateAiSummary();
  const today = format(date, "yyyy-MM-dd");
  const dateLabel =
    period === "today"
      ? format(date, "M月d日")
      : `${format(startOfWeek(date, { weekStartsOn: 1 }), "M月d日")}—${format(date, "M月d日")}`;
  const hasConsent = consent.includes("consent");

  const generate = (nextPeriod: AiSummaryPeriod) => {
    if (!hasConsent || generateSummary.isPending) return;
    setPeriod(nextPeriod);
    setModalOpen(true);
    generateSummary.reset();
    generateSummary.mutate({
      period: nextPeriod,
      date: today,
      style,
      consentToSendRecords: true,
    });
  };

  const closeModal = () => {
    if (generateSummary.isPending) return;
    setModalOpen(false);
    generateSummary.reset();
    // 等弹窗卸载完成后恢复焦点；生成期间按钮禁用会使组件库丢失原触发点。
    requestAnimationFrame(() => summaryTrigger.current?.focus());
  };

  return (
    <section
      className="relative grid min-h-44 grid-cols-1 items-center gap-[18px] overflow-visible rounded-[var(--animal-border-radius-lg)] border-[length:var(--animal-border-width)] border-dashed border-[var(--animal-primary-color-active)] bg-[var(--life-ai-panel-bg)] [background-image:radial-gradient(circle,var(--life-ai-ticket-pattern)_1px,transparent_1.5px)] [background-size:16px_16px] px-[18px] pb-[22px] pt-[78px] sm:gap-7 sm:px-[30px] sm:py-[26px] xl:grid-cols-[minmax(0,1fr)_minmax(356px,440px)]"
      aria-labelledby="ai-summary-title"
    >
      <div className="grid content-center gap-[9px] [&_h2]:m-0 [&_h2]:text-[clamp(24px,2.4vw,32px)] [&_h2]:leading-tight [&_p]:m-0 [&_p]:max-w-[640px] [&_p]:leading-[1.65] [&_p]:text-[var(--animal-text-color-secondary)]">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--animal-surface-color)] px-3 py-[7px] text-xs font-black tracking-[0.08em] text-[var(--animal-primary-color-active)]">
          <Icon name="icon-design" size={22} />
          AI 生活观察员
        </div>
        <h2 id="ai-summary-title">让 AI 真正读懂你的生活节奏</h2>
        <p>系统先在服务端整理事实，再由 AI 提炼重点。AI 只负责解读，不会修改任何记录。</p>
      </div>

      <div className="grid min-w-0 gap-3 rounded-[var(--animal-border-radius-base)] bg-[color-mix(in_srgb,var(--animal-surface-color)_82%,transparent)] p-4">
        <div>
          <span className="mb-2 block text-xs font-black text-[var(--animal-text-color-secondary)]">
            解读语气
          </span>
          <Radio
            options={styleOptions}
            value={style}
            onChange={(value) => {
              const parsed = aiSummaryStyleSchema.safeParse(value);
              if (parsed.success) setStyle(parsed.data);
            }}
          />
        </div>
        <Checkbox options={consentOption} value={consent} onChange={setConsent} />
        <small className="leading-5 text-[var(--animal-text-color-secondary)]">
          仅发送日期、模块、记录标题和汇总数字；不会发送备注、复盘正文、密码或附件。
        </small>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Button
            htmlType="button"
            size="large"
            disabled={!hasConsent || generateSummary.isPending}
            icon={<Icon name="icon-camera" size={22} />}
            onClick={(event) => {
              summaryTrigger.current = event.currentTarget;
              generate("today");
            }}
          >
            生成今日解读
          </Button>
          <Button
            htmlType="button"
            size="large"
            disabled={!hasConsent || generateSummary.isPending}
            icon={<Icon name="icon-miles" size={22} />}
            onClick={(event) => {
              summaryTrigger.current = event.currentTarget;
              generate("week");
            }}
          >
            生成本周解读
          </Button>
        </div>
      </div>

      <img
        className="pointer-events-none absolute right-2.5 top-[-42px] z-[2] h-auto w-[110px] rotate-3 select-none sm:left-[clamp(180px,30vw,280px)] sm:right-auto sm:top-[-76px] sm:w-[130px] xl:left-[clamp(220px,20vw,340px)] xl:top-[-92px] xl:w-[148px]"
        src="/brand/ip-animals-transparent/D1-sloth-left.png"
        alt=""
        aria-hidden="true"
        width={1254}
        height={1254}
        draggable="false"
      />

      <Modal
        className={modalStyles.modal ?? ""}
        open={modalOpen}
        title={period === "today" ? "今日 AI 解读" : "本周 AI 解读"}
        width={780}
        typewriter={false}
        maskClosable={!generateSummary.isPending}
        onClose={closeModal}
        footer={
          <Button
            htmlType="button"
            type="primary"
            disabled={generateSummary.isPending}
            onClick={closeModal}
          >
            收好这张票据
          </Button>
        }
      >
        <div className="mx-auto min-h-[260px] w-[min(100%,660px)]" aria-live="polite">
          {generateSummary.data ? (
            <SummaryTicket summary={generateSummary.data} dateLabel={dateLabel} />
          ) : generateSummary.isError ? (
            <div className="grid min-h-[260px] place-items-center gap-4 rounded-[var(--animal-border-radius-lg)] border-2 border-dashed border-[var(--animal-error-color)] bg-[var(--animal-error-surface)] p-7 text-center">
              <div>
                <strong className="block text-xl">这次没有生成成功</strong>
                <p className="text-[var(--animal-text-color-secondary)]">
                  {generateSummary.error.message}
                </p>
              </div>
              <Button htmlType="button" onClick={() => generate(period)}>
                再试一次
              </Button>
            </div>
          ) : (
            <div
              className="grid min-h-[260px] grid-cols-[minmax(0,1fr)_110px] items-center gap-4 rounded-[var(--animal-border-radius-lg)] border-2 border-[var(--life-ai-ticket-line)] bg-[var(--life-ai-ticket-paper)] p-6 sm:grid-cols-[minmax(0,1fr)_170px]"
              aria-busy="true"
            >
              <div className="grid gap-3">
                <span className="text-xs font-black tracking-[0.16em] text-[var(--life-ai-ticket-muted)]">
                  AI 正在解读
                </span>
                <strong className="text-[clamp(22px,3vw,30px)] leading-[1.35]">
                  先核对事实，再整理生活线索…
                </strong>
                <small className="text-[var(--life-ai-ticket-muted)]">
                  {dateLabel} · 通常只需片刻
                </small>
              </div>
              <img
                className="w-full animate-[ai-observer-float_0.9s_var(--animal-motion-ease)_infinite_alternate] motion-reduce:animate-none"
                src="/brand/module-ip-transparent/J2-overview-owl-right.png"
                alt=""
                aria-hidden="true"
                width={1254}
                height={1254}
                draggable="false"
              />
            </div>
          )}
        </div>
      </Modal>
    </section>
  );
}
