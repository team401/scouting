<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { aggregateEventData } from "@/lib/2025/data-processing";
import { teamLikertRadar, getTeamOverview } from "@/lib/2025/data-visualization";
import { useEventStore } from "@/stores/event-store";
import { useViewModeStore } from '@/stores/view-mode-store';
import { matchScoutTable } from "@/lib/constants";

import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
import FilterableGraph from "@/components/FilterableGraph.vue";
import Dropdown from "@/components/Dropdown.vue";
import RadarChart from "@/components/RadarChart.vue";
import StatHighlight from "@/components/StatHighlight.vue";
import BarChart from "@/components/BarChart.vue";
</script>

<template>
    <div class="main-content">
        <h1>Team Analysis</h1>
        <div v-if="teamsLoaded">
            <!-- Only show this if the team data is loaded. -->
            <Dropdown :choices="teamFilters" v-model="currentTeamIndex" @update:modelValue="setTeam"></Dropdown>

            <div>
                <div class="data-tile">
                    <StatHighlight :stats="teamHighlights"></StatHighlight>
                </div>

                <div class="analysis-row-tile">
                    <div class="graph-tile radar-graph-container">
                        <RadarChart :data="getTeamRadar('likert')" :height="maxChartHeight"></RadarChart>
                    </div>
                    <div class="graph-tile">
                        <BarChart :data="getTeamReef" :height="maxChartHeight" />
                    </div>
                </div>

                <div class="graph-tile match-progression-container">
                    <FilterableGraph :data="getTeamMatches" :graph-filters="matchDataFilters">
                    </FilterableGraph>
                </div>
                <div>

                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    data() {
        return {
            viewMode: null,
            eventStore: null,
            teamsLoaded: false,
            teamsData: [{}],
            teamFilters: [],
            currentTeamIndex: 0,
            matchDataFilters: [
                { text: "Auto: Coral", key1: "coralAutoPoints", type: "line" },
                { text: "Teleop: Coral", key1: "coralTeleopPoints", type: "line" },
                { text: "Barge Points", key1: "bargePoints", type: "line" },
            ]
        }
    },
    methods: {
        async loadTeamsData() {
            // Note: do this to avoid stale data on page refresh.
            await this.eventStore.updateEvent();

            this.teamsData = await aggregateEventData(matchScoutTable, this.eventStore.eventId);

            this.teamFilters = [];
            Object.keys(this.teamsData).forEach(element => {
                this.teamFilters.push({ key: element, text: String(element) });
            })

            // Mark the data as ready for the view to display.
            this.teamsLoaded = true;
        },
        setTeam(idx: int) {
            this.currentTeamIndex = idx;
        },
        getTeamRadar(radarType) {
            if (this.teamFilters.length == 0) {
                return {};
            }

            const teamNumber = this.teamFilters[this.currentTeamIndex].key;
            const teamInfo = this.teamsData[teamNumber];

            if (radarType == "likert") {
                return teamLikertRadar(teamInfo);
            }

            return {};
        },
        getTeamReef() {
            if (this.teamFilters.length == 0) {
                return {};
            }

            const teamNumber = this.teamFilters[this.currentTeamIndex].key;
            const teamInfo = this.teamsData[teamNumber];

            console.log(teamInfo);
        }
    },
    computed: {
        getCurrentTeam() {
            if (this.currentTeamIndex >= this.teamFilters.length || this.teamFilters.length == 0) {
                return {};
            }

            return this.teamFilters[this.currentTeamIndex];
        },
        getTeamMatches() {
            if (this.teamFilters.length == 0) {
                return {};
            }

            const teamNumber = this.teamFilters[this.currentTeamIndex].key;
            const teamInfo = this.teamsData[teamNumber];

            let teamMatches = {};
            for (var i = 0; i < teamInfo.match_data.matchNumber.length; i++) {
                let matchData = {};
                Object.keys(teamInfo.match_data).forEach(key => {
                    if (key != "matchNumber") {
                        matchData[key] = teamInfo.match_data[key][i];
                    }
                });

                const matchNumber = teamInfo.match_data.matchNumber[i];
                teamMatches[matchNumber] = matchData;
            }

            return teamMatches;
        },
        teamHighlights() {
            if (this.teamFilters.length == 0) {
                return {};
            }

            const teamNumber = this.teamFilters[this.currentTeamIndex].key;
            const teamInfo = this.teamsData[teamNumber];
            return getTeamOverview(teamInfo);
        },
        maxChartHeight() {
            return 0.5 * this.viewMode.height;
        }
    },
    created() {
        this.viewMode = useViewModeStore();
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
