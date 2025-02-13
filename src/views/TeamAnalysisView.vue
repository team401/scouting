<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { aggregateEventData } from "@/lib/2025/data-processing";
import { teamRadar } from "@/lib/2025/data-visualization";
import { useEventStore } from "@/stores/event-store";

import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
import FilterableGraph from "@/components/FilterableGraph.vue";
import Dropdown from "@/components/Dropdown.vue";
import RadarChart from "@/components/RadarChart.vue";
</script>

<template>
    <div class="main-content">
        <h1>Team Analysis</h1>
        <div v-if="teamsLoaded">
            <!-- Only show this if the team data is loaded. -->
            <Dropdown :choices="teamFilters" v-model="currentTeamIndex" @update:modelValue="setTeam"></Dropdown>

            <div>
                <div class="data-tile radar-graph-container">
                    <RadarChart :data="getTeamRadar"></RadarChart>
                </div>
                <div class="data-tile match-progression-container">
                    <FilterableGraph :data="getTeamMatches" :graph-filters="matchDataFilters"></FilterableGraph>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    data() {
        return {
            eventStore: null,
            teamsLoaded: false,
            teamsData: [{}],
            teamFilters: [],
            currentTeamIndex: 0,
            matchDataFilters: [
                { text: "Teleop: Amp", key1: "Teleop_Amp_Made", type: "bar", isSorted: false },
                { text: "Teleop: Speaker", key1: "Teleop_Speaker_Made", type: "bar", isSorted: false },
            ]
        }
    },
    methods: {
        async loadTeamsData() {
            // Note: do this to avoid stale data on page refresh.
            await this.eventStore.updateEvent();

            this.teamsData = await aggregateEventData(this.eventStore.eventId);

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
            if (this.currentTeamIndex >= this.teamFilters.length || this.teamFilters.length == 0) {
                return {};
            }

            return this.teamFilters[this.currentTeamIndex];
        },
        getTeamRadar() {
            if (this.teamFilters.length == 0) {
                return {};
            }

            const teamNumber = this.teamFilters[this.currentTeamIndex].key;
            const teamInfo = this.teamsData[teamNumber];

            return teamRadar(teamInfo);
        },
        getTeamMatches() {
            if (this.teamFilters.length == 0) {
                return {};
            }

            const teamNumber = this.teamFilters[this.currentTeamIndex].key;
            const teamInfo = this.teamsData[teamNumber];
            return teamInfo.match_data;
        }
    },
    created() {
        this.eventStore = useEventStore();
        this.loadTeamsData();
    }
}
</script>

<style>
.radar-graph-container {
    height: 60vh;
    min-width: 30vw;
}

.match-progression-container {
    min-height: 60vh;
}
</style>
