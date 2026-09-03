import type { ECharts, EChartsCoreOption } from "echarts/core";
import { useEffect, useRef, useState } from "react";

const chartEnginePromise = import("./chart-engine");

interface EChartCanvasProps {
  ariaLabel: string;
  className?: string;
  option: EChartsCoreOption;
}

export function EChartCanvas({ ariaLabel, className = "h-64", option }: EChartCanvasProps) {
  const chartElement = useRef<HTMLDivElement>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const element = chartElement.current;
    if (!element) return;

    let chart: ECharts | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let isDisposed = false;
    setLoadState("loading");

    void chartEnginePromise
      .then(({ initializeChart }) => {
        if (isDisposed) return;
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        chart = initializeChart(element, option, !prefersReducedMotion);
        resizeObserver = new ResizeObserver(() => chart?.resize());
        resizeObserver.observe(element);
        setLoadState("ready");
      })
      .catch(() => {
        if (!isDisposed) setLoadState("error");
      });

    return () => {
      isDisposed = true;
      resizeObserver?.disconnect();
      chart?.dispose();
    };
  }, [option]);

  return (
    <div className={`relative ${className}`}>
      <div ref={chartElement} className="absolute inset-0" role="img" aria-label={ariaLabel} />
      {loadState === "loading" ? <span className="sr-only">正在加载图表…</span> : null}
      {loadState === "error" ? (
        <p
          className="absolute inset-0 grid place-items-center px-5 text-center text-sm text-[var(--animal-text-color-secondary)]"
          role="alert"
        >
          图表暂时无法加载，请查看文字明细。
        </p>
      ) : null}
    </div>
  );
}
