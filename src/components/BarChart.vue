<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { dataPointColorTranslucent, getThemeColors } from '@/lib/theme';

import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import ChartJSPluginDatalabels from 'chartjs-plugin-datalabels'
import { sortKeyValueArrays } from "@/lib/util";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ChartJSPluginDatalabels)

</script>

<template>
    <div :style="chartStyle">
        <Bar :options="chartOptions" :data="chartData" :key="uniqueKey" />
    </div>
</template>

<script lang="ts">
export default {
    props: {
        column: "",
        data: {},
        isSorted: {
            default: true
        },
        barColor: {
            default: dataPointColorTranslucent
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
        uniqueKey() {
            return JSON.stringify(this.data) + JSON.stringify(getThemeColors());
        },
        chartData() {
            // Initialize the labels to the keys of the dictionary
            let labels = Object.keys(this.data);

            // Populate an array of values.
            let values = [];
            labels.forEach(element => {
                values.push(this.data[element][this.column])
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

            // Build the chart based on the processing above.
            const chart = {
                labels: labels,
                datasets: [{
                    label: this.column,
                    backgroundColor: this.barColor,
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
