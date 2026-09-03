import { LineChart, PieChart } from "echarts/charts";
import { AriaComponent, GridComponent, TooltipComponent } from "echarts/components";
import { type ECharts, type EChartsCoreOption, init, use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

use([LineChart, PieChart, AriaComponent, GridComponent, TooltipComponent, CanvasRenderer]);

export function initializeChart(
  element: HTMLElement,
  option: EChartsCoreOption,
  shouldAnimate: boolean,
): ECharts {
  const chart = init(element, undefined, { renderer: "canvas" });
  chart.setOption({ ...option, animation: shouldAnimate }, { notMerge: true });
  return chart;
}
