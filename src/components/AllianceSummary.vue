<script setup lang="ts">
// @ts-nocheck
import { ourTeamNumber } from "@/lib/constants";
</script>

<template>
    <div class="alliance-view-container">
        <div class="alliance-row">
            <div class="team-tile" v-for="team in allianceTeams">
                <h2>{{ team.teamNumber }}</h2>

                <div v-for="data, key in team.data">
                    {{ key }}: {{ data.toFixed(2) }}
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    props: {
        config: {
            default: null
        }
    },
    computed: {
        allianceTeams() {
            console.log(this.config.teams)
            return this.config.teams;
        }
    },
    methods: {

    }
}
</script>

<style scoped></style>