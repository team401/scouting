<script setup lang="ts">
// TODO: fix types
// @ts-nocheck
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import ChartJSPluginDatalabels from 'chartjs-plugin-datalabels'
import { sortKeyValueArrays } from "@/lib/util";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ChartJSPluginDatalabels)

</script>

<template>
    <Bar :options="chartOptions" :data="chartData" class="bar-chart" />
</template>

<script lang="ts">
export default {
    props: {
        column: "",
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
        isSorted: {
            default: true
        },
        barColor: {
            default: "#ff55ec80"
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
            return this.options;
        }
    }
}
</script>

<style>
.bar-chart {
    height: 100%;
    width: 100%;
}
</style>