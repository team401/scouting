<script setup lang="ts">
import { aggregateEventData, eventId } from "@/lib/2024/data-processing";
import BarChart from "@/components/BarChart.vue";

import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
</script>

<template>
    <div class="main-content">
        <h1>Event Analysis</h1>
        <h2>Graph View</h2>
        <md-outlined-select class="filter-select" v-bind:display-text="graphFilter.text">
            <md-select-option v-for="filter in getGraphFilters" v-bind:selected="filter.key == graphFilter.key"
                :key="filter.key" :ref="graphFilter.key" v-bind:aria-label="filter.text" @click="setGraphView(filter)">
                <div slot="headline">{{ filter.text }}</div>
            </md-select-option>
        </md-outlined-select>

        <div v-if="eventDataLoaded" class="graph-container">
            <!-- Data must be loaded before this div is shown -->
            <BarChart :data="eventData" :column="graphFilter.key" v-if="isBarChartView">
            </BarChart>
        </div>

        <h2>Table View</h2>
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
</template>

<script lang="ts">
export default {
    data() {
        return {
            tableHeaders: [
                { "name": "#", "key": "team_number", "graphable": false },
                { "name": "Matches Played", "key": "num_matches", "graphable": false },
                { "name": "Total Auto Amp", "key": "total_auto_amp", "graphable": true, "graph": "bar" },
                { "name": "Total Teleop Amp", "key": "total_teleop_amp", "graphable": true, "graph": "bar" },
                { "name": "Avg. Teleop Amp", "key": "avg_teleop_amp", "graphable": true, "graph": "bar" }
            ],
            // Expected schema:
            // [{"team_number": 401, "avg_teleop_amp": 3.0, "avg_teleop_speaker": 3.0}, ...]
            tableData: [],
            eventData: {},
            eventDataLoaded: false,
            graphFilter: { "text": "Total Teleop Amp", "key": "total_teleop_amp", "type": "bar" },
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

                // Convert data from aggregated dictionary to the table-friendly form.
                var row = {}
                row['team_number'] = element;
                row['num_matches'] = teamData.num_matches;
                row['total_auto_amp'] = teamData.total_auto_amp;
                row['total_teleop_amp'] = teamData.total_teleop_amp;
                row['avg_teleop_amp'] = teamData.avg_teleop_amp;

                this.tableData.push(row);
            });

            // Mark the table as loaded.
            this.eventDataLoaded = true;
        },
        setGraphView(filter: String) {
            this.graphFilter = filter;
        }
    },
    computed: {
        getGraphFilters() {
            let filters = [];
            this.tableHeaders.forEach(element => {
                if (element.graphable) {
                    filters.push({ "key": element.key, "text": element.name, "type": element.graph });
                }
            });
            return filters;
        },
        isBarChartView() {
            console.log(this.graphFilter)
            return this.graphFilter.type == "bar";
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
</style>
  