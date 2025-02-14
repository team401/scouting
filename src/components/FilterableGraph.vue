<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { useViewModeStore } from '@/stores/view-mode-store';

import BarChart from "@/components/BarChart.vue";
import ScatterChart from "@/components/ScatterChart.vue";
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
            v-if="isBarChartView">
        </BarChart>

        <ScatterChart :data="data" :columnX="getActiveGraphFilter.key1" :columnY="getActiveGraphFilter.key2"
            :height="maxChartHeight" v-if="isScatterChartView"></ScatterChart>
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
        isBarChartView() {
            return this.graphFilters[this.activeGraphFilterIndex]?.type == "bar";
        },
        isScatterChartView() {
            return this.graphFilters[this.activeGraphFilterIndex]?.type == "scatter";
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