<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { dataPointColor, getThemeColors } from '@/lib/theme';

import { Scatter } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, PointElement, CategoryScale, LinearScale } from 'chart.js'
import ChartJSPluginDatalabels from 'chartjs-plugin-datalabels'
import { useViewModeStore } from '@/stores/view-mode-store';

ChartJS.register(Title, Tooltip, Legend, PointElement, CategoryScale, LinearScale, ChartJSPluginDatalabels);

</script>

<template>
    <div :style="chartStyle">
        <Scatter :options="chartOptions" :data="chartData" :key="uniqueKey" />
    </div>
</template>

<script lang="ts">
export default {
    props: {
        columnX: "",
        columnY: "",
        data: {},
        pointColor: {
            default: dataPointColor
        },
        pointRadius: {
            default: 6
        },
        pointHoverRadius: {
            default: 8
        },
        height: {
            default: 300
        }
    },
    data() {
        return {
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    datalabels: {
                        color: getThemeColors().text.dataLabels,
                        align: 'top',
                        offset: 8,
                        font: {
                            weight: 'bold'
                        },
                        formatter: function (value, context) {
                            return context.chart.data.labels[context.dataIndex];
                        }
                    }
                }
            }
        }
    },
    computed: {
        uniqueKey() {
            return JSON.stringify(this.data) + JSON.stringify(getThemeColors());
        },
        chartData() {
            // Initialize the labels to the keys of the dictionary
            let labels = Object.keys(this.data);

            // Populate an array of values, which are x,y coordinates.
            let values = [];
            labels.forEach(element => {
                const xVal = this.data[element][this.columnX];
                const yVal = this.data[element][this.columnY];
                values.push({ "x": xVal, "y": yVal });
            });

            // Build the chart based on the processing above.
            const chart = {
                labels: labels,
                datasets: [{
                    label: "data",
                    backgroundColor: this.pointColor,
                    data: values,
                    pointRadius: this.pointRadius,
                    pointHoverRadius: this.pointHoverRadius,
                    color: getThemeColors().text.axes
                }]
            };

            // Label the axes.
            this.options.scales = {
                x: {
                    title: {
                        text: this.columnX,
                        display: true,
                        color: getThemeColors().text.axesText
                    },
                    grid: {
                        color: getThemeColors().grid.lines
                    },
                    ticks: {
                        color: getThemeColors().text.axesText
                    }
                },
                y: {
                    title: {
                        text: this.columnY,
                        display: true,
                        color: getThemeColors().text.axesText
                    },
                    grid: {
                        color: getThemeColors().grid.lines
                    },
                    ticks: {
                        color: getThemeColors().text.axesText
                    }
                }
            }

            return chart;
        },
        chartOptions() {
            return this.options;
        },
        chartStyle() {
            return {
                "display": "flex",
                "height": this.height + "px",
                "width": "100%",
                "align-items": "safe center",
                "justify-content": "safe center"
            }
        }
    }
}
</script>
