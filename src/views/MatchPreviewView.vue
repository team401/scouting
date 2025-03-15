<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { aggregateEventData, eventStatisticsKeys, getPitScoutData } from "@/lib/2025/data-processing";
import { teamLikertRadar, getTeamOverview, teamReefData } from "@/lib/2025/data-visualization";
import { useEventStore } from "@/stores/event-store";
import { useViewModeStore } from '@/stores/view-mode-store';
import { matchScoutTable, pitScoutTable, teamInfoTable } from "@/lib/constants";

import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
import Dropdown from "@/components/Dropdown.vue";
import StatHighlight from "@/components/StatHighlight.vue";
import { supabase } from "@/lib/supabase-client";

</script>

<template>
    <div class="main-content">
        <h1>Match Preview</h1>
        <div v-if="teamsLoaded && isDataAvailable">
            <!-- Only show this if the team data is loaded. -->
            <h2>Red Alliance</h2>
            <div class="data-tile red-alliance">
                <Dropdown :choices="teamFilters" v-model="teamIndices[0]" @update:modelValue="setTeam(0, $event)">
                </Dropdown>

                <StatHighlight :stats="teamHighlights(0)" :is-vertical="false"></StatHighlight>
            </div>
            <div class="data-tile red-alliance">
                <Dropdown :choices="teamFilters" v-model="teamIndices[1]" @update:modelValue="setTeam(1, $event)">
                </Dropdown>

                <StatHighlight :stats="teamHighlights(1)" :is-vertical="false"></StatHighlight>
            </div>
            <div class="data-tile red-alliance">
                <Dropdown :choices="teamFilters" v-model="teamIndices[2]" @update:modelValue="setTeam(2, $event)">
                </Dropdown>

                <StatHighlight :stats="teamHighlights(2)" :is-vertical="false"></StatHighlight>
            </div>


            <h2>Blue Alliance</h2>
            <div class="data-tile red-alliance">
                <Dropdown :choices="teamFilters" v-model="teamIndices[3]" @update:modelValue="setTeam(3, $event)">
                </Dropdown>

                <StatHighlight :stats="teamHighlights(3)" :is-vertical="false"></StatHighlight>
            </div>
            <div class="data-tile red-alliance">
                <Dropdown :choices="teamFilters" v-model="teamIndices[4]" @update:modelValue="setTeam(4, $event)">
                </Dropdown>

                <StatHighlight :stats="teamHighlights(4)" :is-vertical="false"></StatHighlight>
            </div>
            <div class="data-tile red-alliance">
                <Dropdown :choices="teamFilters" v-model="teamIndices[5]" @update:modelValue="setTeam(5, $event)">
                </Dropdown>

                <StatHighlight :stats="teamHighlights(5)" :is-vertical="false"></StatHighlight>
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

            console.log(this.teamFilters)

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
        teamHighlights(team) {
            if (this.teamFilters.length == 0) {
                return {};
            }

            const teamIndex = this.teamIndices[team];
            const teamNumber = this.teamFilters[teamIndex].key;
            const teamInfo = this.teamsData[teamNumber];

            return getTeamOverview(teamInfo, teamNumber, this.getEventStats());
        },
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

<style></style>
