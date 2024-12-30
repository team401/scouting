<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import BarChart from "@/components/BarChart.vue";
import ScatterChart from "@/components/ScatterChart.vue";
import FilterDropdown from "@/components/FilterDropdown.vue";

import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
</script>

<template>
    <div>
        <FilterDropdown :filters="graphFilters" @filter-selected="setGraphView"></FilterDropdown>
    </div>
    <div class="graph-container">
        <!-- Show the relevant chart based on the data being shown -->
        <BarChart :data="data" :column="getActiveGraphFilter.key1" :isSorted="isChartSorted" v-if="isBarChartView">
        </BarChart>

        <ScatterChart :data="data" :columnX="getActiveGraphFilter.key1" :columnY="getActiveGraphFilter.key2"
            v-if="isScatterChartView"></ScatterChart>
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
        }
    },
    data() {
        return {
            activeGraphFilterIndex: 0
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
        }
    }
}
</script>

<style>
.graph-container {
    display: flex;
    width: 100%;
    flex: 1 1 auto;
    justify-content: center;
}
</style>