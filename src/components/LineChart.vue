<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { dataPointColorTranslucent, getThemeColors } from '@/lib/theme';

import { Line } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale } from 'chart.js'
import ChartJSPluginDatalabels from 'chartjs-plugin-datalabels'
import { sortKeyValueArrays } from "@/lib/util";

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, ChartJSPluginDatalabels)

</script>

<template>
    <div :style="chartStyle">
        <Line :options="chartOptions" :data="chartData" />
    </div>
</template>

<script lang="ts">
export default {
    props: {
        column: "",
        data: {},
        options: {
            default: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    datalabels: {
                        display: false
                    }
                }
            }
        },
        lineColor: {
            default: dataPointColorTranslucent
        },
        pointColor: {
            default: dataPointColorTranslucent
        },
        height: {
            default: 100
        }
    },
    computed: {
        chartData() {
            // Initialize the labels to the keys of the dictionary
            let labels = Object.keys(this.data);

            // Populate an array of values.
            let values = [];
            labels.forEach(element => {
                values.push(this.data[element][this.column])
            });

            // Build the chart based on the processing above.
            const chart = {
                labels: labels,
                datasets: [{
                    label: this.column,
                    backgroundColor: this.pointColor,
                    borderColor: this.lineColor,
                    data: values
                }]
            };

            this.options.scales = {
                x: {
                    grid: {
                        color: getThemeColors().grid.lines
                    },
                    ticks: {
                        color: getThemeColors().text.axesText
                    }
                },
                y: {
                    grid: {
                        color: getThemeColors().grid.lines
                    },
                    ticks: {
                        color: getThemeColors().text.axesText
                    }
                }
            };

            this.options.plugins.legend = {
                labels: {
                    color: getThemeColors().text.legend
                }
            };

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
