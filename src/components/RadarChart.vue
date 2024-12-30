<script setup lang="ts">
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

ChartJS.register(Title, Tooltip, Legend, PointElement, RadialLinearScale, LineElement, ChartJSPluginDatalabels);

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
        pointColor: {
            default: "#ff55ec"
        },
        pointRadius: {
            default: 6
        },
        pointHoverRadius: {
            default: 8
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
                    backgroundColor: this.pointColor,
                    data: values,
                    label: "Team Dimensions"
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