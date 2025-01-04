<script setup lang="ts">
// @ts-nocheck
import FormSection from "@/components/FormSection.vue";
import QRCode from "@/components/QRCode.vue";
import { parseMatchData, submitMatchData } from "@/lib/2024/data-submission";

import "@material/web/button/filled-button";
</script>

<template>
    <div class="main-content">
        <h1>Match Scouting</h1>

        <form>
            <FormSection v-for="section in scoutForm" :section-key="section.key" :name="section.name"
                :components="section.components" :color="getAllianceColor"></FormSection>
        </form>

        <div class="data-tile" v-if="submitFailed">
            <h1>DATA UPLOAD FAILED</h1>
            <h1>SCAN THIS QR CODE</h1>
            <QRCode :qr-data="submitData"></QRCode>


            <h3>Save this text to a file if a scanner is unavailable</h3>
            <p>
                {{ getSubmitDataString }}
            </p>
        </div>

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
            ],
            // Track data submission in order to fall back to QR code / copy text if it fails.
            submitData: {},
            submitFailed: false
        }
    },
    methods: {
        async submitForm() {
            // Parse the data to submit separately from the act of submitting the data to the database in case the connection fails.
            this.submitData = parseMatchData(this.scoutForm)

            // Data submission hasn't failed yet...
            this.submitFailed = false;

            // Attempt to submit the data.
            const error = await submitMatchData(this.submitData);

            // If the database submission failed, set the QR code to show and print the error.
            if (error) {
                console.log(error);
                this.submitFailed = true;
                return;
            }

            // Mark the submission as successful and reset the submission data.
            this.submitFailed = false;
            this.submitData = {};

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

            // The form submission no longer has failed since the data is being reset.
            this.submitFailed = false;
        }
    },
    computed: {
        getAllianceColor() {
            // This is hardcoded, so it may need to change.
            const switchPos = this.scoutForm[0].components[3].value;
            let allianceColor = switchPos ? "blue" : "red";
            return allianceColor;
        },
        getSubmitDataString() {
            return JSON.stringify(this.submitData);
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

p {
    overflow-wrap: anywhere;
}
</style>
