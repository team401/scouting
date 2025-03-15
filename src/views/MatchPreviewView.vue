<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { aggregateEventData, getPitScoutData } from "@/lib/2025/data-processing";
import { teamLikertRadar, getAllianceOverview, getRankedStyle, getRanking } from "@/lib/2025/data-visualization";
import { useEventStore } from "@/stores/event-store";
import { useViewModeStore } from '@/stores/view-mode-store';
import { matchScoutTable, pitScoutTable, teamInfoTable } from "@/lib/constants";

import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
import Dropdown from "@/components/Dropdown.vue";
import { supabase } from "@/lib/supabase-client";

</script>

<template>
    <div class="main-content">
        <h1>Match Preview</h1>
        <div v-if="teamsLoaded && isDataAvailable">
            <!-- Only show this if the team data is loaded. -->
            <h2>Red Alliance</h2>
            <div class="data-tile red-alliance">
                Red 1: <Dropdown :choices="teamFilters" v-model="teamIndices[0]" @update:modelValue="setTeam(0, $event)">
                </Dropdown>

                Red 2: <Dropdown :choices="teamFilters" v-model="teamIndices[1]" @update:modelValue="setTeam(1, $event)">
                </Dropdown>

                Red 3: <Dropdown :choices="teamFilters" v-model="teamIndices[2]" @update:modelValue="setTeam(2, $event)">
                </Dropdown>
            </div>

            <div class="data-tile red-alliance">
                <div>
                    <div v-for="data, col in allianceHighlights([0, 1, 2])" class="alliance-data-container">
                        <h3>{{ col }}</h3>
                        <div class="alliance-stat-view">
                            <div v-for="team, idx in getTeamNumbers([0, 1, 2])" class="alliance-col-data">
                                <u>{{ team }}</u>
                                {{ data.value[idx].toFixed(2) }}
                                <div v-if="data.rank[idx] > 0">
                                    <span :style="getRankedStyle(data.normalized[idx])">{{ getRanking(data.rank[idx])
                                    }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <h2>Blue Alliance</h2>
            <div class="data-tile blue-alliance">
                Blue 1: <Dropdown :choices="teamFilters" v-model="teamIndices[3]" @update:modelValue="setTeam(3, $event)">
                </Dropdown>

                Blue 2: <Dropdown :choices="teamFilters" v-model="teamIndices[4]" @update:modelValue="setTeam(4, $event)">
                </Dropdown>

                Blue 3: <Dropdown :choices="teamFilters" v-model="teamIndices[5]" @update:modelValue="setTeam(5, $event)">
                </Dropdown>
            </div>

            <div class="data-tile blue-alliance">
                <div>
                    <div v-for="data, col in allianceHighlights([3, 4, 5])" class="alliance-data-container">
                        <h3>{{ col }}</h3>
                        <div class="alliance-stat-view">
                            <div v-for="team, idx in getTeamNumbers([3, 4, 5])" class="alliance-col-data">
                                <u>{{ team }}</u>
                                {{ data.value[idx].toFixed(2) }}
                                <div v-if="data.rank[idx] > 0">
                                    <span :style="getRankedStyle(data.normalized[idx])">{{ getRanking(data.rank[idx])
                                    }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div v-else-if="teamsLoaded">
            <h2>No Data Available</h2>
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
            pitData: [{}],
            teamFilters: [],
            teamIndices: [0, 0, 0, 0, 0, 0]
        }
    },
    methods: {
        async loadTeamsData() {
            // Note: do this to avoid stale data on page refresh.
            await this.eventStore.updateEvent();

            this.teamsData = await aggregateEventData(matchScoutTable, this.eventStore.eventId);

            const { data, error } = await supabase.from(teamInfoTable).select("*").eq("event_id", this.eventStore.eventId);
            let teamTextMap = {};
            if (error) {
                console.log(error);
            } else {
                for (var team of data) {
                    teamTextMap[team.team_number] = String(team.team_number) + " - " + String(team.name);
                }
            }

            this.teamFilters = [];
            Object.keys(teamTextMap).forEach(element => {
                let teamText = String(element);
                if (Object.keys(teamTextMap).includes(element)) {
                    teamText = teamTextMap[element];
                }
                this.teamFilters.push({ key: element, text: teamText });
            })

            this.pitData = await getPitScoutData(pitScoutTable, this.eventStore.eventId);

            // Mark the data as ready for the view to display.
            this.teamsLoaded = true;
        },
        setTeam(idx: int, data: int) {
            this.teamIndices[idx] = data;
        },
        getEventStats() {
            // Downselect the event stats to only those relevant for comparing a team to the population.
            let eventStats = {
                rankings: this.teamsData.rankings,
                distributions: this.teamsData.distributions
            }

            return eventStats;
        },
        getTeamRadar(radarType) {
            if (this.teamFilters.length == 0) {
                return {};
            }

            const teamNumber = this.teamFilters[this.currentTeamIndex].key;
            const teamInfo = this.teamsData[teamNumber];

            if (radarType == "likert") {
                return teamLikertRadar(teamInfo, this.getEventStats());
            }

            return {};
        },
        allianceHighlights(teams) {
            // Get team information.
            let teamNumbers = [];
            let teamInfos = [];

            for (var i = 0; i < teams.length; i++) {
                const teamIndex = this.teamIndices[teams[i]];
                const teamNumber = this.teamFilters[teamIndex].key;
                const teamInfo = this.teamsData[teamNumber];
                teamNumbers.push(teamNumber);
                teamInfos.push(teamInfo);
            }

            let overview = getAllianceOverview(teamInfos, teamNumbers, this.getEventStats());
            return overview;
        },
        getTeamNumbers(teams) {
            let teamNumbers = [];

            for (var i = 0; i < teams.length; i++) {
                const teamIndex = this.teamIndices[teams[i]];
                const teamNumber = this.teamFilters[teamIndex].key;
                teamNumbers.push(teamNumber);
            }

            teamNumbers.push("Total")

            return teamNumbers;
        }
    },
    computed: {
        isDataAvailable() {
            return this.teamFilters.length > 0;
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
.alliance-stat-view {
    display: flex;
    flex-direction: row;
}

.alliance-data-container {
    display: flex;
    flex-direction: column;
}

.alliance-col-data {
    display: flex;
    flex-direction: column;
    padding: 20px;
}

.red-alliance {
    border: 2px solid red;
}

.blue-alliance {
    border: 2px solid blue;
}
</style>
