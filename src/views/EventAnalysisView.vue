<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { aggregateEventData } from "@/lib/2025/data-processing";
import { useEventStore } from "@/stores/event-store";
import { useViewModeStore } from "@/stores/view-mode-store";
import { matchScoutTable } from "@/lib/constants";

import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
import FilterableGraph from "@/components/FilterableGraph.vue";
</script>

<template>
    <div class="main-content">
        <h1>Event Analysis</h1>
        <h2>Graph View</h2>


        <div v-if="eventDataLoaded" class="graph-tile">
            <!-- Data must be loaded before this div is shown -->
            <FilterableGraph :data="eventData" :graphFilters="graphFilters" :max-data-points="maxDataPoints">
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
            viewMode: null,
            tableHeaders: [
                { name: "#", key: "team_number" },
                { name: "Matches Played", key: "num_matches" },
                { name: "Avg. Points", key: "mean_matchPoints" },
                { name: "Avg. Coral Points", key: "mean_coralPoints" },
                { name: "Avg. Algae Points", key: "mean_algaePoints" },
                { name: "Avg. Auto Coral Points", key: "mean_coralAutoPoints" },
                { name: "Avg. Teleop Coral Points", key: "mean_coralTeleopPoints" },
                { name: "Avg. Teleop Algae Points", key: "mean_algaeTeleopPoints" },
                { name: "Avg. Barge Points", key: "mean_bargePoints" },
            ],
            // Expected schema:
            // [{"team_number": 401, "metric_name_1": 3.0, "metric_name_2": 3.0}, ...]
            tableData: [],
            eventData: {},
            eventDataLoaded: false,
            // Graphing
            graphFilters: [
                { text: "Avg. Points", key1: "mean_matchPoints", type: "bar" },
                { text: "Avg. Auto Points", key1: "mean_autoPoints", type: "bar" },
                { text: "Coral vs. Algae", key1: "mean_coralPoints", key2: "mean_algaePoints", type: "scatter" },
                { text: "Teleop: Coral vs. Algae", key1: "mean_coralTeleopPoints", key2: "mean_algaeTeleopPoints", type: "scatter" },
                { text: "Avg. Barge Points", key1: "mean_bargePoints", type: "bar" },
            ]
        }
    },
    methods: {
        async loadEventData() {
            // Note: do this to avoid stale data on page refresh.
            await this.eventStore.updateEvent();

            this.eventData = await aggregateEventData(matchScoutTable, this.eventStore.eventId);

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
    computed: {
        maxDataPoints() {
            // Only show the top 6 bar graph items if this is on a phone.
            if (this.viewMode.isMobile) {
                return 6;
            }
            return null;
        }
    },
    created() {
        this.eventStore = useEventStore();
        this.viewMode = useViewModeStore();
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
  