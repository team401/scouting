<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { aggregateEventData, eventId } from "@/lib/2024/data-processing";

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
        },
        getTeamMatches() {
            const teamNumber = this.teamFilters[this.currentTeamIndex].key;
            const teamInfo = this.teamsData[teamNumber];
            return teamInfo.match_data;
        }
    },
    created() {
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
