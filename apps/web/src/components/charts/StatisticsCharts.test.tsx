// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DonutChart, LineTrendChart } from "./StatisticsCharts";

vi.mock("./EChartCanvas", () => ({
  EChartCanvas: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

describe("StatisticsCharts", () => {
  it("环形图同时提供分类金额和占比文本", () => {
    render(
      <DonutChart
        ariaLabel="本月支出分类"
        centerLabel="本月支出"
        centerValue="¥100.00"
        data={[
          { name: "餐饮", value: 70, valueLabel: "¥70.00" },
          { name: "交通", value: 30, valueLabel: "¥30.00" },
        ]}
      />,
    );

    expect(screen.getByRole("img", { name: "本月支出分类" })).toBeInTheDocument();
    const details = screen.getByRole("list", { name: "本月支出分类明细" });
    expect(within(details).getByText("¥70.00 · 70%")).toBeInTheDocument();
    expect(within(details).getByText("¥30.00 · 30%")).toBeInTheDocument();
  });

  it("趋势图为辅助技术保留每个时间点的读数", () => {
    render(
      <LineTrendChart
        ariaLabel="最近体重趋势"
        unit="kg"
        points={[{ id: "one", label: "09-03", value: 62.4, valueLabel: "62.4 kg" }]}
      />,
    );

    expect(screen.getByRole("img", { name: "最近体重趋势" })).toBeInTheDocument();
    expect(screen.getByText("09-03：62.4 kg")).toBeInTheDocument();
  });
});
