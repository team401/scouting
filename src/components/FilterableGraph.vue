<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { useViewModeStore } from '@/stores/view-mode-store';

import BarChart from "@/components/BarChart.vue";
import BoxPlot from '@/components/BoxPlot.vue';
import LineChart from "@/components/LineChart.vue";
import ScatterChart from "@/components/ScatterChart.vue";
import StackedBarChart from "@/components/StackedBarChart.vue";
import Dropdown from "@/components/Dropdown.vue";

import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
</script>

<template>
    <div>
        <Dropdown :choices="graphFilters" v-model="activeGraphFilterIndex" @update:modelValue="setGraphView"></Dropdown>
    </div>
    <div class="graph-container">
        <!-- Show the relevant chart based on the data being shown -->
        <BarChart :data="data" :column="getActiveGraphFilter.key1" :isSorted="isChartSorted" :height="maxChartHeight"
            :max-labels="maxDataPoints" :is-horizontal="isChartHorizontal" :x-scale="chartXScale" :y-scale="chartYScale"
            v-if="isBarChartView">
        </BarChart>
        <ScatterChart :data="data" :columnX="getActiveGraphFilter.key1" :columnY="getActiveGraphFilter.key2"
            :height="maxChartHeight" v-else-if="isScatterChartView"></ScatterChart>
        <LineChart :data="data" :column="getActiveGraphFilter.key1" :height="maxChartHeight" v-else-if="isLineChartView">
        </LineChart>
        <StackedBarChart :data="data" :columns="getActiveGraphFilter.keyList" :bar-colors="getActiveGraphFilter.colorList"
            :height="maxChartHeight" v-else-if="isStackedBarChartView">
        </StackedBarChart>
        <!-- Set :key in order to force remount. this needs to happen since box plot rendering is done in mounted() rather than dynamically -->
        <BoxPlot :key="uniqueKey" :data="data" :column="getActiveGraphFilter.key1" :sub-column="getActiveGraphFilter.key2"
            :isSorted="isChartSorted" :height="maxChartHeight" :max-labels="maxDataPoints"
            :is-horizontal="isChartHorizontal" :x-scale="chartXScale" :y-scale="chartYScale" v-else-if="isBoxPlotView">
        </BoxPlot>
    </div>
</template>

<script lang="ts">
export default {
    props: {
        data: {
            default: {}
        },
        graphFilters: {
            default: []
        },
        maxHeightRatio: {
            default: 0.7
        },
        maxDataPoints: {
            default: null
        }
    },
    data() {
        return {
            activeGraphFilterIndex: 0,
            viewMode: null,
        }
    },
    methods: {
        setGraphView(index: int) {
            this.activeGraphFilterIndex = index;
        }
    },
    computed: {
        uniqueKey() {
            // TODO: make this better. This is a hack to ensure plots reload if data or filters change.
            const key = JSON.stringify(this.data) + JSON.stringify(this.graphFilters[this.activeGraphFilterIndex]);
            return key;
        },
        getActiveGraphFilter() {
            return this.graphFilters[this.activeGraphFilterIndex];
        },
        isChartSorted() {
            const activeFilter = this.graphFilters[this.activeGraphFilterIndex];
            if ("isSorted" in activeFilter) {
                return activeFilter.isSorted;
            }
            // Default to sorted.
            return true;
        },
        isChartHorizontal() {
            const activeFilter = this.graphFilters[this.activeGraphFilterIndex];
            if ("isHorizontal" in activeFilter) {
                return activeFilter.isHorizontal;
            }
            // Default to vertical.
            return false;
        },
        chartXScale() {
            return this.graphFilters[this.activeGraphFilterIndex]?.xScale;
        },
        chartYScale() {
            return this.graphFilters[this.activeGraphFilterIndex]?.yScale;
        },
        isBarChartView() {
            return this.graphFilters[this.activeGraphFilterIndex]?.type == "bar";
        },
        isScatterChartView() {
            return this.graphFilters[this.activeGraphFilterIndex]?.type == "scatter";
        },
        isLineChartView() {
            return this.graphFilters[this.activeGraphFilterIndex]?.type == "line";
        },
        isStackedBarChartView() {
            return this.graphFilters[this.activeGraphFilterIndex]?.type == "stacked-bar";
        },
        isBoxPlotView() {
            return this.graphFilters[this.activeGraphFilterIndex]?.type == "boxplot";
        },
        maxChartHeight() {
            return this.maxHeightRatio * this.viewMode.windowHeight;
        }
    },
    created() {
        this.viewMode = useViewModeStore();
    }
}
</script>

<style scoped>
.graph-container {
    display: flex;
    width: 100%;
    height: 100%;
    flex: 1 1 auto;
    justify-content: center;
}
</style>