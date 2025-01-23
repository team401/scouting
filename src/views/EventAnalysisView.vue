<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { aggregateEventData } from "@/lib/2024/data-processing";
import { useEventStore } from "@/stores/event-store";

import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
import FilterableGraph from "@/components/FilterableGraph.vue";
</script>

<template>
    <div class="main-content">
        <h1>Event Analysis</h1>
        <h2>Graph View</h2>


        <div v-if="eventDataLoaded" class="data-tile">
            <!-- Data must be loaded before this div is shown -->
            <FilterableGraph :data="eventData" :graphFilters="graphFilters">
            </FilterableGraph>
        </div>

        <h2>Table View</h2>
        <div class="table-container" v-if="eventDataLoaded">
            <VTable :data="tableData">
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
            eventStore: null,
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
            ]
        }
    },
    methods: {
        async loadEventData() {
            // Note: do this to avoid stale data on page refresh.
            await this.eventStore.updateEvent();

            this.eventData = await aggregateEventData(this.eventStore.eventId);

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
        }
    },
    created() {
        this.eventStore = useEventStore();
        this.loadEventData();
    }
}
</script>
  
<style>
.table-container {
    display: flex;
    overflow: scroll;
    justify-content: safe center;
    margin: auto;
}
</style>
  