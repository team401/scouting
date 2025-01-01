<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

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
    <Radar :options="chartOptions" :data="chartData" class="radar-chart" />
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
                maintainAspectRatio: true,
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
                backgroundColors: ['rgba(255,99,132,0.2)'],
                borderColors: ['rgba(255,99,132,1)'],
                pointBackgroundColors: ['rgba(255,99,132,1)'],
                pointHoverBorderColors: ['rgba(255,99,132,1)']
            }
        }
    },
    computed: {
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
            return chart;
        },
        chartOptions() {
            return this.options;
        }
    }
}
</script>

<style>
.radar-chart {
    height: 100%;
    width: 100%;
}
</style>