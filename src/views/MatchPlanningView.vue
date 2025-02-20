<script setup lang="ts">
// @ts-nocheck
import { useEventStore } from "@/stores/event-store";
import { ourTeamNumber, matchScoutTable } from "@/lib/constants";
import { aggregateEventData } from "@/lib/2025/data-processing";

import Dropdown from "@/components/Dropdown.vue";
import AllianceSummary from "@/components/AllianceSummary.vue";
</script>

<template>
    <div class="main-content">
        <h1>Match Planning</h1>
        <div v-if="dataReady">
            <Dropdown :choices="matchFilters" v-model="currentMatchIndex" @update:modelValue="setMatch"></Dropdown>

            <AllianceSummary :config="getAllianceConfig('red')"></AllianceSummary>

            <AllianceSummary :config="getAllianceConfig('blue')"></AllianceSummary>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    data() {
        return {
            eventStore: null,
            matchFilters: [],
            currentMatchIndex: 0,
            scheduleLoaded: false,
            teamsLoaded: false,
            teamsData: null
        }
    },
    methods: {
        async loadMatchSchedule() {
            // Note: do this to avoid stale data on page refresh.
            await this.eventStore.updateEvent();

            this.scheduleLoaded = true;
        },
        async loadTeamsData() {
            // Note: do this to avoid stale data on page refresh.
            await this.eventStore.updateEvent();

            this.teamsData = await aggregateEventData(matchScoutTable, this.eventStore.eventId);

            this.teamsLoaded = true;
        },
        setMatch(idx: int) {
            this.currentMatchIndex = idx;
        },
        getAllianceConfig(color) {
            if (!this.teamsLoaded) {
                return;
            }

            var allianceTeams = {};
            if (color == "red") {
                allianceTeams = [401, 0, 13];
            } else {
                allianceTeams = [70, 1, 8]
            }

            let config = {
                teams: []
            };

            allianceTeams.forEach(team => {
                const teamInfo = this.teamsData[String(team)];
                let teamData = {
                    teamNumber: team,
                    data: {
                        "Auto: Coral L4": teamInfo.mean_coralAutoL4Count,
                        "Auto: Coral L3": teamInfo.mean_coralAutoL3Count,
                        "Auto: Coral L2": teamInfo.mean_coralAutoL2Count,
                        "Auto: Coral L1": teamInfo.mean_coralAutoL1Count
                    }
                }
                config.teams.push(teamData);
            });

            return config;
        },
    },
    computed: {
        dataReady() {
            return this.teamsLoaded && this.scheduleLoaded;
        }
    },
    created() {
        this.eventStore = useEventStore();
        this.loadTeamsData();
        this.loadMatchSchedule();
    }
}
</script>

<style scoped></style>
