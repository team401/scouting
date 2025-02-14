<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { Scatter } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, PointElement, CategoryScale, LinearScale } from 'chart.js'
import ChartJSPluginDatalabels from 'chartjs-plugin-datalabels'

ChartJS.register(Title, Tooltip, Legend, PointElement, CategoryScale, LinearScale, ChartJSPluginDatalabels);

</script>

<template>
    <div :style="chartStyle">
        <Scatter :options="chartOptions" :data="chartData" />
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
                maintainAspectRatio: true,
                plugins: {
                    datalabels: {
                        color: '#333',
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
        },
        pointColor: {
            default: "#ff55ec"
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
    computed: {
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
                    label: "Y-axis: " + this.columnY + ", X-axis: " + this.columnX,
                    backgroundColor: this.pointColor,
                    data: values,
                    pointRadius: this.pointRadius,
                    pointHoverRadius: this.pointHoverRadius
                }]
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
