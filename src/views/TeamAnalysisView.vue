<script setup lang="ts">
import { aggregateEventData, eventId } from "@/lib/2024/data-processing";

import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
import FilterableGraph from "@/components/FilterableGraph.vue";
import FilterDropdown from "@/components/FilterDropdown.vue";
import RadarChart from "@/components/RadarChart.vue";
</script>

<template>
    <div class="main-content">
        <h1>Team Analysis</h1>
        <div v-if="teamsLoaded">
            <!-- Only show this if the team data is loaded. -->
            <FilterDropdown :filters="teamFilters" @filter-selected="setTeam"></FilterDropdown>

            <div class="radar-graph-container">
                <RadarChart :data="getTeamRadar"></RadarChart>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    data() {
        return {
            teamsLoaded: false,
            teamsData: [{}],
            teamFilters: [],
            currentTeamIndex: 0
        }
    },
    methods: {
        async loadTeamsData() {
            this.teamsData = await aggregateEventData(eventId);

            this.teamFilters = [];
            Object.keys(this.teamsData).forEach(element => {
                this.teamFilters.push({ key: element, text: String(element) });
            })

            // Mark the data as ready for the view to display.
            this.teamsLoaded = true;
        },
        setTeam(idx: int) {
            this.currentTeamIndex = idx;
        }
    },
    computed: {
        getCurrentTeam() {
            if (this.currentTeamIndex >= this.teamFilters.length) {
                return {};
            }

            return this.teamFilters[this.currentTeamIndex];
        },
        getTeamRadar() {
            const teamNumber = this.teamFilters[this.currentTeamIndex].key;
            const teamInfo = this.teamsData[teamNumber];

            return { "Auto Amp": teamInfo.avg_auto_amp, "Teleop Speaker": teamInfo.avg_teleop_speaker, "Teleop Amp": teamInfo.avg_teleop_amp };
        }
    },
    created() {
        this.loadTeamsData();
    }
}
</script>

<style>
.radar-graph-container {
    display: flex;
    max-height: 50vh;
    justify-content: safe center;
    background-color: #FFF;
    border-radius: 10px;
    width: fit-content;
    margin: 15px;
}
</style>
