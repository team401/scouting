<script setup lang="ts">
import { aggregateEventData } from "@/lib/2024/data-processing";

</script>

<template>
    <div class="main-content">
        <h1>Event Analysis</h1>

        <VTable :data="tableData" v-if="tableLoaded">
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
                { "name": "#", "key": "team_number" },
                { "name": "Matches Played", "key": "num_matches" },
                { "name": "Total Teleop Amp", "key": "total_teleop_amp" }
            ],
            // Expected schema:
            // [{"team_number": 401, "avg_teleop_amp": 3.0, "avg_teleop_speaker": 3.0}, ...]
            tableData: [],
            eventData: {},
            tableLoaded: false
        }
    },
    methods: {
        async populateEventTable() {
            this.eventData = await aggregateEventData("2024vagi2");

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
                row['total_teleop_amp'] = teamData.total_teleop_amp;

                this.tableData.push(row);
            });

            // Mark the table as loaded.
            this.tableLoaded = true;
        }
    },
    created() {
        this.populateEventTable();
    }
}
</script>
  
<style></style>
  