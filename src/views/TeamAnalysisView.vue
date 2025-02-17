<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { aggregateEventData } from "@/lib/2025/data-processing";
import { teamLikertRadar, getTeamOverview, teamReefData } from "@/lib/2025/data-visualization";
import { useEventStore } from "@/stores/event-store";
import { useViewModeStore } from '@/stores/view-mode-store';
import { matchScoutTable } from "@/lib/constants";

import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
import FilterableGraph from "@/components/FilterableGraph.vue";
import Dropdown from "@/components/Dropdown.vue";
import RadarChart from "@/components/RadarChart.vue";
import StatHighlight from "@/components/StatHighlight.vue";

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
                    <div class="graph-tile">
                        <RadarChart :data="getTeamRadar('likert')" :height="maxChartHeight"></RadarChart>
                    </div>
                    <div class="graph-tile">
                        <h2>Reef Heatmap</h2>
                        <FilterableGraph :data="getTeamReef" :graph-filters="reefFilters" max-height-ratio="0.5">
                        </FilterableGraph>
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
            ],
            reefFilters: [
                { text: "Auto Avg. Count", key1: "auto_mean_count", type: "bar", isHorizontal: true, isSorted: false },
                { text: "Teleop Avg. Count", key1: "teleop_mean_count", type: "bar", isHorizontal: true, isSorted: false },
                {
                    text: "Total Accuracy", key1: "total_accuracy", type: "bar", isHorizontal: true, isSorted: false, xScale: {
                        min: 0,
                        max: 100
                    }
                },
                {
                    text: "Auto Accuracy", key1: "auto_accuracy", type: "bar", isHorizontal: true, isSorted: false, xScale: {
                        min: 0,
                        max: 100
                    }
                },
                {
                    text: "Teleop Accuracy", key1: "teleop_accuracy", type: "bar", isHorizontal: true, isSorted: false, xScale: {
                        min: 0,
                        max: 100
                    }
                },
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

        getTeamReef() {
            if (this.teamFilters.length == 0) {
                return {};
            }

            const teamNumber = this.teamFilters[this.currentTeamIndex].key;
            const teamInfo = this.teamsData[teamNumber];
            const reefData = teamReefData(teamInfo);

            return reefData;
        },
        maxChartHeight() {
            return 0.5 * this.viewMode.windowHeight;
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
    /* height: 60vh; */
    min-width: 30vw;
}

.match-progression-container {
    min-height: 60vh;
}
</style>
