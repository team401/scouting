<script setup lang="ts">
import BarChart from "@/components/BarChart.vue";
import ScatterChart from "@/components/ScatterChart.vue";
import FilterDropdown from "@/components/FilterDropdown.vue";

import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
</script>

<template>
    <FilterDropdown :filters="graphFilters" @filter-selected="setGraphView"></FilterDropdown>

    <div class="graph-container">
        <!-- Show the relevant chart based on the data being shown -->
        <BarChart :data="data" :column="getActiveGraphFilter.key1" v-if="isBarChartView"></BarChart>

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
    max-height: 60vh;
    justify-content: center;
}
</style>