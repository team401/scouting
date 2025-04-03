<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { aggregateEventData, eventStatisticsKeys, getPitScoutData } from "@/lib/2025/data-processing";
import { teamLikertRadar, getTeamOverview, teamReefData } from "@/lib/2025/data-visualization";
import { useEventStore } from "@/stores/event-store";
import { useViewModeStore } from '@/stores/view-mode-store';
import { matchScoutTable, pitScoutTable, teamInfoTable, robotPhotoTable } from "@/lib/constants";

import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
import "@material/web/button/filled-button";
import FilterableGraph from "@/components/FilterableGraph.vue";
import Dropdown from "@/components/Dropdown.vue";
import BarChart from "@/components/BarChart.vue";
import RadarChart from "@/components/RadarChart.vue";
import StatHighlight from "@/components/StatHighlight.vue";
import { supabase } from "@/lib/supabase-client";

</script>

<template>
    <div class="main-content">
        <h1>Team Analysis</h1>
        <div v-if="teamsLoaded && isDataAvailable">
            <!-- Only show this if the team data is loaded. -->
            <Dropdown :choices="teamFilters" v-model="currentTeamIndex" @update:modelValue="setTeam"></Dropdown>

            <div>
                <div class="analysis-row-tile">
                    <input ref="file" type="file" v-on:change="uploadImage" hidden>
                    <div class="image-tile" v-if="isRobotPhotoAvailable">
                        <img :src="getRobotPhotoUrl" />
                        <md-filled-button v-on:click="chooseFiles" type="file">Upload a Different Image</md-filled-button>
                    </div>
                    <div class="file-upload-tile" v-else>
                        <md-filled-button v-on:click="chooseFiles" type="file">Upload Image</md-filled-button>
                    </div>
                    <div class="data-tile">
                        <StatHighlight :stats="teamHighlights" :is-vertical="true"></StatHighlight>
                    </div>
                    <div class="graph-tile">
                        <RadarChart :data="getTeamRadar('likert')" :height="maxChartHeight"></RadarChart>
                    </div>
                    <div class="graph-tile">
                        <h2>Reef Heatmap</h2>
                        <FilterableGraph :data="getTeamReef" :graph-filters="reefFilters" max-height-ratio="0.5">
                        </FilterableGraph>
                    </div>
                    <div class="graph-tile">
                        <h2>Start Position</h2>
                        <BarChart :data="getTeamStart" column="count" :height="maxChartHeight"></BarChart>
                    </div>
                </div>

                <div class="graph-tile match-progression-container">
                    <h2>Match Analysis</h2>
                    <FilterableGraph :data="getTeamMatches" :graph-filters="matchDataFilters">
                    </FilterableGraph>
                </div>

                <div class="data-tile">
                    <h2>Comments</h2>
                    <div v-for="comment in getComments">
                        <div v-if="comment && comment.text.length > 0" class="comment-tile">
                            Match {{ comment.match }} ({{ comment.scoutInfo }}): {{ comment.text }}
                        </div>
                    </div>
                </div>

                <div class="data-tile">
                    <h2>Pit Scouting Report</h2>
                    <div v-for="data, key in getTeamPitReport">
                        {{ key }}: {{ data }}
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
            teamPhotoLoaded: false,
            teamPhotoAvailable: false,
            teamPhotoUrl: "",
            teamsData: [{}],
            pitData: [{}],
            teamFilters: [],
            currentTeamIndex: 0,
            matchDataFilters: [
                { text: "Breakdown", keyList: ['coralPoints', 'algaePoints', 'bargePoints'], colorList: ['#ff55ecff', '#5dfc75ff', '#647afaff'], type: "stacked-bar" },
                { text: "Auto vs. Teleop", keyList: ["autoPoints", "teleopPoints"], colorList: ['#ff55ecff', '#5dfc75ff'], type: "stacked-bar" },
                { text: "Auto: Coral", key1: "coralAutoPoints", type: "line" },
                { text: "Teleop: Coral", key1: "coralTeleopPoints", type: "line" },
                { text: "Teleop: Algae", key1: "algaeTeleopPoints", type: "line" },
                { text: "Barge Points", key1: "bargePoints", type: "line" },
                { text: "Foul Points", key1: "foulPoints", type: "line" },
                { text: "Algae Dislodged", key1: "algaeTotalDislodgedCount", type: "line" },
            ],
            reefFilters: [
                { text: "Auto Count", key1: "auto_count", type: "boxplot", isHorizontal: true, isSorted: false },
                { text: "Teleop Count", key1: "teleop_count", type: "boxplot", isHorizontal: true, isSorted: false },
            ]
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

            // Object.keys(this.teamsData).forEach(element => {
            //     if (!eventStatisticsKeys.includes(element)) {

            //     }
            // })

            this.pitData = await getPitScoutData(pitScoutTable, this.eventStore.eventId);

            // Mark the data as ready for the view to display.
            this.teamsLoaded = true;

            this.getRobotPhoto();
        },
        async getRobotPhoto() {
            // Initialize to the team photo not being available.
            this.teamPhotoAvailable = false;

            // This function can only work once teams are loaded due to the dependence on getTeamNumber.
            const teamNumber = this.getTeamNumber();

            // If the team number is negative, this function has been called before the teams are loaded.
            if (teamNumber < 0) {
                this.teamPhotoLoaded = true;
                return;
            }

            // get the team photo URL
            const { data, error } = await supabase.from(robotPhotoTable).select("*").eq("team_number", teamNumber);

            if (error) {
                console.log(error);

                // Even if there is an error, mark the photo as loaded to indicate that we tried to load it and failed (via the lack of photo availability).
                this.teamPhotoLoaded = true;
                return;
            } else if (data.length == 0) {
                // Even if there is no photo, mark the photo as loaded to indicate that we tried to load it and failed (via the lack of photo availability).
                this.teamPhotoLoaded = true;
                return;
            }

            this.teamPhotoUrl = data[0].photo_url;
            this.teamPhotoAvailable = true;

            this.teamPhotoLoaded = true;
        },
        getTeamNumber() {
            if (this.currentTeamIndex >= this.teamFilters.length || this.teamFilters.length == 0) {
                return -1;
            }

            return this.teamFilters[this.currentTeamIndex].key;
        },
        setTeam(idx: int) {
            this.currentTeamIndex = idx;
            this.getRobotPhoto();
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
        chooseFiles() {
            let fileInputElement = this.$refs.file;
            fileInputElement.click();
        },
        uploadImage() {
            let fileInputElement = this.$refs.file;
            if (fileInputElement.files[0]) {
                let selectedFile = fileInputElement.files[0];
                console.log('Selected file:', selectedFile.name);
                console.log('File size:', selectedFile.size);
                console.log('File type:', selectedFile.type);
            }
        }
    },
    computed: {
        isDataAvailable() {
            return this.teamFilters.length > 0;
        },
        isRobotPhotoAvailable() {
            return this.teamPhotoAvailable;
        },
        getRobotPhotoUrl() {
            if (this.teamPhotoLoaded) {
                return this.teamPhotoUrl;
            }
            return "";
        },
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
            if (!teamInfo) {
                return {};
            }

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
            return getTeamOverview(teamInfo, teamNumber, this.getEventStats());
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
        getTeamStart() {
            if (this.teamFilters.length == 0) {
                return {};
            }

            const teamNumber = this.teamFilters[this.currentTeamIndex].key;
            const teamInfo = this.teamsData[teamNumber];
            if (!teamInfo) {
                return {};
            }

            let startPositions = {};
            for (var i = 0; i < teamInfo.match_data.startPosition.length; i++) {
                const position = teamInfo.match_data.startPosition[i];

                if (Object.keys(startPositions).includes(position)) {
                    startPositions[position].count += 1;
                } else {
                    startPositions[position] = {
                        count: 1
                    };
                }
            }

            return startPositions;
        },
        getComments() {
            if (this.teamFilters.length == 0) {
                return [];
            }

            const teamNumber = this.teamFilters[this.currentTeamIndex].key;
            const teamInfo = this.teamsData[teamNumber];
            if (!teamInfo) {
                return {};
            }

            let comments = teamInfo.match_data.comments;
            let matchNumbers = teamInfo.match_data.matchNumber;
            let scoutNames = teamInfo.match_data.scoutName;
            let scoutTeams = teamInfo.match_data.scoutTeam;

            let commentData = []
            for (var i = 0; i < comments.length; i++) {
                var scoutInfo = scoutNames[i];
                if (scoutTeams && scoutTeams[i]) {
                    scoutInfo += " - " + scoutTeams[i];
                }
                commentData.push({ text: comments[i], match: matchNumbers[i], scoutInfo: scoutInfo });
            }

            return commentData;
        },
        getTeamPitReport() {
            if (this.teamFilters.length == 0) {
                return {};
            }

            const teamNumber = this.teamFilters[this.currentTeamIndex].key;
            const teamPit = this.pitData[teamNumber];
            if (!teamPit) {
                return {};
            }

            return teamPit;
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

.quarter-page-width {
    min-width: 25vw;
}

.half-page-width {
    min-width: 50vw;
}

.three-quarter-page-width {
    min-width: 75vw;
}
</style>
