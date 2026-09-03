import type { EChartsCoreOption } from "echarts/core";
import { useMemo } from "react";
import { EChartCanvas } from "./EChartCanvas";

const chartColors = [
  "#4f9185",
  "#e78268",
  "#d8a83e",
  "#78986e",
  "#7b8faa",
  "#ad7c91",
  "#9a765b",
] as const;

export interface DonutChartDatum {
  name: string;
  value: number;
  valueLabel: string;
}

interface DonutChartProps {
  ariaLabel: string;
  centerLabel: string;
  centerValue: string;
  data: DonutChartDatum[];
}

export function DonutChart({ ariaLabel, centerLabel, centerValue, data }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const option = useMemo<EChartsCoreOption>(
    () => ({
      aria: { enabled: true, decal: { show: true } },
      color: [...chartColors],
      tooltip: { trigger: "item", formatter: "{b}<br/>{c} · {d}%" },
      series: [
        {
          type: "pie",
          radius: ["57%", "82%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: "#fffaf0",
            borderRadius: 7,
            borderWidth: 4,
          },
          label: { show: false },
          emphasis: { scaleSize: 6 },
          data: data.map((item) => ({ name: item.name, value: item.value })),
        },
      ],
    }),
    [data],
  );

  return (
    <div className="grid min-w-0 justify-items-center gap-5">
      <div className="relative w-full max-w-[300px]">
        <EChartCanvas ariaLabel={ariaLabel} className="h-[230px] w-full" option={option} />
        <div
          className="pointer-events-none absolute inset-0 grid place-content-center text-center"
          aria-hidden="true"
        >
          <span className="text-xs font-extrabold text-[var(--animal-text-color-secondary)]">
            {centerLabel}
          </span>
          <strong className="mt-1 text-lg text-[var(--animal-text-color)]">{centerValue}</strong>
        </div>
      </div>
      <ul
        className="m-0 flex w-full list-none flex-wrap justify-center gap-2.5 p-0"
        aria-label={`${ariaLabel}明细`}
      >
        {data.map((item, index) => {
          const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <li
              className="grid w-full grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[var(--animal-border-radius-sm)] bg-[var(--animal-bg-color)] px-3 py-2.5 sm:w-[300px]"
              key={item.name}
            >
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: chartColors[index % chartColors.length] }}
                aria-hidden="true"
              />
              <span className="min-w-0 font-bold">{item.name}</span>
              <span className="whitespace-nowrap text-sm text-[var(--animal-text-color-secondary)]">
                {item.valueLabel} · {share}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export interface LineTrendPoint {
  id: string;
  label: string;
  value: number;
  valueLabel: string;
}

interface LineTrendChartProps {
  ariaLabel: string;
  points: LineTrendPoint[];
  unit: string;
}

export function LineTrendChart({ ariaLabel, points, unit }: LineTrendChartProps) {
  const option = useMemo<EChartsCoreOption>(
    () => ({
      aria: { enabled: true, decal: { show: true } },
      color: [chartColors[0]],
      grid: { left: 12, right: 18, top: 28, bottom: 10, containLabel: true },
      tooltip: { trigger: "axis", valueFormatter: (value: unknown) => `${String(value)} ${unit}` },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: points.map((point) => point.label),
        axisLine: { lineStyle: { color: "#d9cfbf" } },
        axisTick: { show: false },
        axisLabel: { color: "#856f55", hideOverlap: true },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: { color: "#856f55", formatter: `{value} ${unit}` },
        splitLine: { lineStyle: { color: "#ebe3d7", type: "dashed" } },
      },
      series: [
        {
          type: "line",
          smooth: 0.35,
          showSymbol: true,
          symbol: "circle",
          symbolSize: 9,
          lineStyle: { width: 4 },
          itemStyle: { borderColor: "#fffaf0", borderWidth: 3 },
          areaStyle: { color: "rgba(79, 145, 133, 0.14)" },
          data: points.map((point) => point.value),
        },
      ],
    }),
    [points, unit],
  );

  return (
    <div className="min-w-0">
      <EChartCanvas ariaLabel={ariaLabel} className="h-[280px] w-full" option={option} />
      <ol className="sr-only">
        {points.map((point) => (
          <li key={point.id}>
            {point.label}：{point.valueLabel}
          </li>
        ))}
      </ol>
    </div>
  );
}
