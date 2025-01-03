<script setup lang="ts">
// @ts-nocheck
import FormSection from "@/components/FormSection.vue";
import { submitMatchData } from "@/lib/2024/data-submission";

import "@material/web/button/filled-button";
</script>

<template>
    <div class="main-content">
        <h1>Match Scouting</h1>

        <form>
            <FormSection v-for="section in scoutForm" :section-key="section.key" :name="section.name"
                :components="section.components" :color="getAllianceColor"></FormSection>
        </form>

        <div class="button-container">
            <md-filled-button v-on:click="submitForm">SUBMIT</md-filled-button>
            <md-filled-button v-on:click="resetFormData">RESET</md-filled-button>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    data() {
        return {
            scoutForm: [
                {
                    key: "prematch",
                    name: "Pre-match",
                    components: [
                        {
                            key: "scout_name",
                            label: "Scout Name",
                            type: "text",
                            options: {},
                            defaultValue: "",
                            value: "",
                            preserveAfterSubmit: true
                        },
                        {
                            key: "match_number",
                            label: "Match Number",
                            type: "number",
                            options: {},
                            defaultValue: "0",
                            value: "0"
                        },
                        {
                            key: "team_number",
                            label: "Team Number",
                            type: "number",
                            options: {},
                            defaultValue: 0,
                            value: 0
                        },
                        {
                            key: "alliance",
                            label: "Alliance",
                            type: "optionswitch",
                            options: {
                                unselected: "Red",
                                selected: "Blue"
                            },
                            defaultValue: false,
                            value: false
                        },
                        {
                            key: "position",
                            label: "Start Position",
                            type: "dropdown",
                            options: {
                                choices: [
                                    { key: "source", text: "Source" },
                                    { key: "middle", text: "Middle" },
                                    { key: "amp", text: "Amp" }
                                ]
                            },
                            defaultValue: 0,
                            value: 0
                        },
                        {
                            key: "noshow",
                            label: "No Show",
                            type: "switch",
                            options: {},
                            defaultValue: false,
                            value: false
                        },
                    ]
                },
                {
                    key: "auto",
                    name: "Autonomous",
                    components: [
                        {
                            key: "moved",
                            label: "Moved?",
                            type: "switch",
                            options: {},
                            defaultValue: false,
                            value: false
                        },
                        {
                            key: "speaker_scored",
                            label: "Speaker Scored",
                            type: "counter",
                            options: {},
                            defaultValue: 0,
                            value: 0
                        },
                        {
                            key: "speaker_missed",
                            label: "Speaker Missed",
                            type: "counter",
                            options: {},
                            defaultValue: 0,
                            value: 0
                        },
                    ]
                },
                {
                    key: "teleop",
                    name: "Teleop",
                    components: [
                        {
                            key: "speaker_scored",
                            label: "Speaker Scored",
                            type: "counter",
                            options: {},
                            defaultValue: 0,
                            value: 0
                        },
                        {
                            key: "speaker_missed",
                            label: "Speaker Missed",
                            type: "counter",
                            options: {},
                            defaultValue: 0,
                            value: 0
                        },
                    ]
                },
                {
                    key: "postmatch",
                    name: "Post Match",
                    components: [
                        {
                            key: "comments",
                            label: "Comments",
                            type: "textarea",
                            options: {},
                            defaultValue: "",
                            value: ""
                        },
                    ]
                }
            ]
        }
    },
    methods: {
        async submitForm() {
            const error = await submitMatchData(this.scoutForm);

            if (error) {
                console.log(error);
                return;
            }

            // Preserve some things that don't need to be re-entered.
            this.preserveSingleEntryData();

            // Reset all non-preserved data.
            this.resetFormData();

        },
        preserveSingleEntryData() {
            // Iterate over all components and set their default values to be whatever was submitted most recently.
            this.scoutForm.forEach(section => {
                section.components.forEach(component => {
                    if (component.preserveAfterSubmit) {
                        component.defaultValue = component.value;
                    }
                })
            });
        },
        resetFormData() {
            // Reset all data to their default values.
            this.scoutForm.forEach(section => {
                section.components.forEach(component => {
                    component.value = component.defaultValue;
                })
            });
        }
    },
    computed: {
        getAllianceColor() {
            // This is hardcoded, so it may need to change.
            const switchPos = this.scoutForm[0].components[3].value;
            let allianceColor = switchPos ? "blue" : "red";
            return allianceColor;
        }
    }
}
</script>

<style scoped>
.button-container {
    display: flex;
    justify-content: safe center;
    align-items: safe center;
    width: 100%;
}

md-filled-button {
    margin: 10px;
}
</style>
