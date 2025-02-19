// TODO: fix types
// @ts-nocheck

import { createTypedChart } from 'vue-chartjs'
import { BoxPlotChart } from '@sgratzl/chartjs-chart-boxplot';

class BoxPlotter extends BoxPlotChart {
  static override id = 'box-plotter'

  public override draw() {
    super.draw()

    if (this.chart?.tooltip && this.chart.tooltip.opacity > 0) {
      const ctx = this.chart.ctx

      new BoxPlotChart(ctx, {
        data: this.chart.data,
        options: this.chart.options
      });
    }
  }
}

export const BoxPlotChartFactory = createTypedChart(
  'box-plotter' as 'bar',
  BoxPlotter
)

