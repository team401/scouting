<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { getThemeColors } from '@/lib/theme';

import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import ChartJSPluginDatalabels from 'chartjs-plugin-datalabels'
import { sortKeyValueArrays } from "@/lib/util";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ChartJSPluginDatalabels)

</script>

<template>
    <div :style="chartStyle">
        <Bar :options="chartOptions" :data="chartData" />
    </div>
</template>

<script lang="ts">
export default {
    props: {
        columns: {
            default: []
        },
        data: {},
        isSorted: {
            default: true
        },
        barColors: {
            default: []
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
    computed: {
        chartData() {
            // Initialize the labels to the keys of the dictionary
            let labels = Object.keys(this.data);

            let datasets = [];
            for (var i = 0; i < this.columns.length; i++) {
                const columnName = this.columns[i];

                // Populate an array of values.
                let values = [];
                labels.forEach(element => {
                    values.push(this.data[element][columnName])
                });

                const dataset = {
                    label: columnName,
                    backgroundColor: this.barColors[i],
                    data: values
                };
                datasets.push(dataset)
            }

            // Build the chart based on the processing above.
            const chart = {
                labels: labels,
                datasets: datasets
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
                        labels: {
                            color: getThemeColors().text.legend
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
