<script setup lang="ts">
// @ts-nocheck
import FormSection from "@/components/FormSection.vue";
</script>

<template>
    <div class="main-content">
        <h1>Match Scouting</h1>

        <form>
            <FormSection v-for="section in scoutForm" :section-key="section.key" :name="section.name"
                :components="section.components"></FormSection>
        </form>

        <button v-on:click="showFormData">SHOW</button>
        <button v-on:click="resetFormData">RESET</button>

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
                            value: ""
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
                                unselected: "Red Alliance",
                                selected: "Blue Alliance"
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
        showFormData() {
            console.log(this.scoutForm)
        },
        resetFormData() {
            this.scoutForm.forEach(section => {
                section.components.forEach(component => {
                    component.value = component.defaultValue;
                })
            });
        }
    }
}
</script>
