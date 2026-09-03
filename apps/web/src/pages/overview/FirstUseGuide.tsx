import { Button, Card } from "animal-island-ui";
import { useState } from "react";

interface FirstUseGuideProps {
  onStart: () => void;
  onDismiss: () => void;
}

const firstUseSteps = [
  ["选一个入口", "从一笔账开始最轻松，金额和日期就够了。"],
  ["只记真实发生的事", "不用补齐过去，也不需要一次填满所有模块。"],
  ["保存后回来看看", "记录会同步出现在总览和时光档案。"],
] as const;

export function FirstUseGuide({ onStart, onDismiss }: FirstUseGuideProps) {
  const [isExampleVisible, setIsExampleVisible] = useState(false);

  return (
    <Card
      color="app-yellow"
      pattern="yellow-green"
      role="region"
      aria-labelledby="first-use-guide-title"
      className="overflow-hidden px-6 py-7 sm:px-8 sm:py-8"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(440px,1.1fr)] xl:items-center">
        <div className="min-w-0">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-text-color)]">
            3 分钟启程
          </p>
          <h2
            id="first-use-guide-title"
            className="mb-3 mt-2 text-pretty text-[clamp(24px,3vw,34px)] leading-tight"
          >
            先记一件真的发生过的小事
          </h2>
          <p className="m-0 max-w-[620px] leading-relaxed text-[var(--animal-text-color-secondary)]">
            不用先设置完整系统。完成一条记录，总览和时光档案就会开始工作。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="primary" size="large" onClick={onStart}>
              记下第一笔
            </Button>
            <Button
              type="dashed"
              size="large"
              aria-expanded={isExampleVisible}
              aria-controls="first-use-example"
              onClick={() => setIsExampleVisible((value) => !value)}
            >
              {isExampleVisible ? "收起示例" : "先看示例"}
            </Button>
            <Button type="text" size="large" onClick={onDismiss}>
              暂时跳过
            </Button>
          </div>
          {isExampleVisible ? (
            <section
              id="first-use-example"
              aria-label="示例记录预览"
              className="mt-5 grid gap-2 rounded-[var(--animal-border-radius-base)] border-2 border-dashed border-[var(--animal-border-color)] bg-[var(--animal-bg-color)] p-4"
            >
              <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
                <strong className="min-w-0 break-words">午餐</strong>
                <span className="tabular-nums">支出 ¥28.50</span>
              </div>
              <small className="leading-relaxed text-[var(--animal-text-color-secondary)]">
                这只是预览，不会写入你的真实数据。
              </small>
            </section>
          ) : null}
        </div>

        <ol className="m-0 grid list-none gap-3 p-0" aria-label="首次记录步骤">
          {firstUseSteps.map(([title, description], index) => (
            <li
              key={title}
              className="grid grid-cols-[40px_minmax(0,1fr)] items-start gap-3 rounded-[var(--animal-border-radius-base)] bg-[color-mix(in_srgb,var(--animal-surface-color)_86%,transparent)] p-4"
            >
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-full bg-[var(--animal-primary-color)] font-black text-white"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <strong className="block leading-snug">{title}</strong>
                <p className="mb-0 mt-1 text-sm leading-relaxed text-[var(--animal-text-color-secondary)]">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
