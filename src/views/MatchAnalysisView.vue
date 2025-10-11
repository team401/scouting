<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { aggregateEventData, eventStatisticsKeys } from "@/lib/2025/data-processing";
import { useEventStore } from "@/stores/event-store";
import { useViewModeStore } from "@/stores/view-mode-store";
import { matchScoutTable } from "@/lib/constants";
import { filterOutKeys } from "@/lib/util";

import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
import FilterableGraph from "@/components/FilterableGraph.vue";
import BoxPlotVue from "@/components/BoxPlot.vue";
</script>

<template>
    <div class="main-content">
        <h1>Match Analysis</h1>
    </div>
</template>

