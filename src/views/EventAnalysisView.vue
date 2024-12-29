<script setup lang="ts">
import { aggregateEventData, eventId } from "@/lib/2024/data-processing";
import BarChart from "@/components/BarChart.vue";
import ScatterChart from "@/components/ScatterChart.vue";

import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
</script>

<template>
    <div class="main-content">
        <h1>Event Analysis</h1>
        <h2>Graph View</h2>
        <md-outlined-select class="filter-select" v-bind:display-text="getActiveGraphFilter.text">
            <md-select-option v-for="filter, idx in getGraphFilters"
                v-bind:selected="filter.key == getActiveGraphFilter.key" :key="filter.key" :ref="getActiveGraphFilter.key"
                v-bind:aria-label="filter.text" @click="setGraphView(idx)">
                <div slot="headline">{{ filter.text }}</div>
            </md-select-option>
        </md-outlined-select>

        <div v-if="eventDataLoaded" class="graph-container">
            <!-- Data must be loaded before this div is shown -->
            <!-- Show the relevant chart based on the data being shown -->
            <BarChart :data="eventData" :column="getActiveGraphFilter.key1" v-if="isBarChartView"></BarChart>

            <ScatterChart :data="eventData" :columnX="getActiveGraphFilter.key1" :columnY="getActiveGraphFilter.key2"
                v-if="isScatterChartView"></ScatterChart>
        </div>

        <h2>Table View</h2>
        <div class="table-container">
            <VTable :data="tableData" v-if="eventDataLoaded">
                <template #head>
                    <tr>
                        <VTh v-for="header in tableHeaders" :sortKey="header.key">
                            {{ header.name }}
                        </VTh>
                    </tr>
                </template>
                <template #body="{ rows }">
                    <tr v-for="row in rows">
                        <td v-for="col in row">{{ col }}</td>
                    </tr>
                </template>
            </VTable>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    data() {
        return {
            tableHeaders: [
                { name: "#", key: "team_number" },
                { name: "Matches Played", key: "num_matches" },
                { name: "Avg. Auto Amp", key: "avg_auto_amp" },
                { name: "Avg. Teleop Amp", key: "avg_teleop_amp" },
                { name: "Avg. Teleop Speaker", key: "avg_teleop_speaker" },
            ],
            // Expected schema:
            // [{"team_number": 401, "avg_teleop_amp": 3.0, "avg_teleop_speaker": 3.0}, ...]
            tableData: [],
            eventData: {},
            eventDataLoaded: false,
            // Graphing
            graphFilters: [
                { text: "Avg. Teleop Amp", key1: "avg_teleop_amp", type: "bar" },
                { text: "Teleop: Speaker vs. Amp", key1: "avg_teleop_amp", key2: "avg_teleop_speaker", type: "scatter" }
            ],
            activeGraphFilterIndex: 0,
        }
    },
    methods: {
        async populateEventTable() {
            this.eventData = await aggregateEventData(eventId);

            // Convert the data to a table.
            this.tableData = [];

            // Iterate over the keys in the dataset to populate the teams list.
            Object.keys(this.eventData).forEach(element => {
                // Get the corresponding entry of aggregated data
                const teamData = this.eventData[element];

                const row = {};
                this.tableHeaders.forEach(element => {
                    row[element.key] = teamData[element.key];
                });

                this.tableData.push(row);
            });

            // Mark the table as loaded.
            this.eventDataLoaded = true;
        },
        setGraphView(index: int) {
            this.activeGraphFilterIndex = index;
        }
    },
    computed: {
        getGraphFilters() {
            return this.graphFilters;
        },
        getActiveGraphFilter() {
            return this.graphFilters[this.activeGraphFilterIndex];
        },
        isBarChartView() {
            return this.graphFilters[this.activeGraphFilterIndex].type == "bar";
        },
        isScatterChartView() {
            return this.graphFilters[this.activeGraphFilterIndex].type == "scatter";
        }
    },
    created() {
        this.populateEventTable();
    }
}
</script>
  
<style>
.graph-container {
    display: flex;
    max-height: 60vh;
    justify-content: center;
}

.table-container {
    display: flex;
    overflow: scroll;
    justify-content: safe center;
    margin: auto;
}

table {
    margin: auto;
}
</style>
  