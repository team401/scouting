<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { dataPointColorTranslucent, dataPointAccentColorTranslucent, getThemeColors } from '@/lib/theme';

import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import ChartJSPluginDatalabels from 'chartjs-plugin-datalabels'
import { sortKeyValueArrays } from "@/lib/util";
import { BoxPlotChart } from '@sgratzl/chartjs-chart-boxplot';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ChartJSPluginDatalabels)


</script>

<template>
    <div :style="chartStyle">
        <canvas id="myChart" />
    </div>
</template>

<script lang="ts">
export default {
    props: {
        column: {
            default: null
        },
        subColumn: {
            default: null
        },
        data: {},
        isSorted: {
            default: true
        },
        borderStyle: {
            default: {
                color: dataPointColorTranslucent,
                width: 3
            }
        },
        itemStyle: {
            default: {
                color: dataPointAccentColorTranslucent
            }
        },
        height: {
            default: 100
        },
        maxLabels: {
            default: null
        },
        isHorizontal: {
            default: false
        },
        xRange: {
            default: {}
        },
        yRange: {
            default: {}
        }
    },
    data() {
        return {
            boxPlotChart: null
        }
    },
    computed: {
        chartStyle() {
            return {
                "display": "flex",
                "height": this.height + "px",
                "width": "100%",
                "align-items": "safe center",
                "justify-content": "safe center"
            }
        }
    },
    methods: {
        chartData() {
            // Initialize the labels to the keys of the dictionary
            let labels = Object.keys(this.data);

            // Populate an array of values.
            let values = [];
            labels.forEach(element => {
                const columnData = this.data[element][this.column];
                let value = columnData;
                if (this.subColumn != null && Object.keys(columnData).includes(this.subColumn)) {
                    value = columnData[this.subColumn];
                }
                values.push(value)
            });

            // Sort the data if requested.
            if (this.isSorted) {
                const sorted = sortKeyValueArrays(labels, values);

                // Reconstruct a key array and a value array.
                labels = [];
                values = [];
                for (const [key, val] of sorted) {
                    labels.push(key);
                    values.push(val);
                }
            }

            // Limit the amount of data shown if requested.
            if (this.maxLabels != null) {
                labels = labels.slice(0, this.maxLabels);
                values = values.slice(0, this.maxLabels);
            }

            return {
                labels: labels,
                values: values
            }
        },
        chartDataSetup() {
            const data = this.chartData();
            const labels = data.labels;
            const values = data.values;

            // Build the chart based on the processing above.
            const chart = {
                labels: labels,
                datasets: [{
                    label: this.column,
                    borderColor: this.borderStyle?.color,
                    borderWidth: this.borderStyle?.width,
                    itemRadius: 2,
                    itemStyle: 'circle',
                    itemBackgroundColor: this.itemStyle?.color,
                    backgroundColor: getThemeColors().background,
                    data: values
                }]
            };
            return chart;
        },
        chartOptions() {
            let indexAxis = 'x';
            if (this.isHorizontal) {
                indexAxis = 'y';
            }

            let options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    datalabels: {
                        display: false
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        displayColors: false,
                        callbacks: {
                            label: (context) => {
                                const meanLabel = "mean: " + context.parsed.mean;
                                const medianLabel = "median: " + context.parsed.median;
                                const minLabel = "min: " + context.parsed.min;
                                const maxLabel = "max: " + context.parsed.max;

                                let label = [
                                    meanLabel,
                                    medianLabel,
                                    minLabel,
                                    maxLabel
                                ]
                                return label;
                            }
                        }
                    }
                },
                indexAxis: indexAxis,
                scales: {
                    x: {
                        min: this.xRange?.min,
                        max: this.xRange?.max,
                        stacked: true,
                        grid: {
                            color: getThemeColors().grid.lines
                        },
                        ticks: {
                            color: getThemeColors().text.axesText
                        }
                    },
                    y: {
                        min: this.yRange?.min,
                        max: this.yRange?.max,
                        stacked: true,
                        grid: {
                            color: getThemeColors().grid.lines
                        },
                        ticks: {
                            color: getThemeColors().text.axesText
                        }
                    },
                }
            };

            return options;
        },
    },
    mounted() {
        const ctx = document.getElementById('myChart').getContext('2d');
        if (!ctx) {
            return;
        }

        this.boxPlotChart = new BoxPlotChart(ctx, {
            data: this.chartDataSetup(),
            options: this.chartOptions()
        });
    }
}
</script>
