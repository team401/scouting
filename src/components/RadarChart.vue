<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { radarRedTheme, getThemeColors } from '@/lib/theme';

import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
    Title
} from 'chart.js'
import { Radar } from 'vue-chartjs'
import ChartJSPluginDatalabels from 'chartjs-plugin-datalabels'

ChartJS.register(Title, Tooltip, Legend, PointElement, RadialLinearScale, LineElement, Filler, ChartJSPluginDatalabels);

</script>

<template>
    <div :style="chartStyle">
        <Radar :options="chartOptions" :data="chartData" class="radar-chart" :key="uniqueKey" />
    </div>
</template>

<script lang="ts">
export default {
    props: {
        columnX: "",
        columnY: "",
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
        pointRadius: {
            default: 6
        },
        pointHoverRadius: {
            default: 8
        },
        colors: {
            default: {
                backgroundColors: [radarRedTheme.background],
                borderColors: [radarRedTheme.border],
                pointBackgroundColors: [radarRedTheme.pointBackground],
                pointHoverBorderColors: [radarRedTheme.pointHoverBorder]
            }
        },
        height: {
            default: 200
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
            let values = Object.values(this.data);

            // Build the chart based on the processing above.
            const chart = {
                labels: labels,
                datasets: [{
                    backgroundColor: this.colors.backgroundColors[0],
                    data: values,
                    label: "Scoring Dimensions",
                    borderColor: this.colors.borderColors[0],
                    pointBackgroundColor: this.colors.pointBackgroundColors[0],
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: this.colors.pointHoverBorderColors[0],
                }]
            };

            this.options.plugins.legend = {
                labels: {
                    color: getThemeColors().text.legend
                }
            }

            this.options.scales = {
                r: {
                    grid: {
                        color: getThemeColors().grid.lines
                    },
                    angleLines: {
                        color: getThemeColors().grid.lines
                    },
                    ticks: {
                        color: getThemeColors().text.axesText,
                        showLabelBackdrop: false
                    },
                    pointLabels: {
                        color: getThemeColors().text.axesText
                    }
                },
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
