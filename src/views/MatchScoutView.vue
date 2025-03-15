<script setup lang="ts">
// @ts-nocheck
import FormSection from "@/components/FormSection.vue";
import QRCode from "@/components/QRCode.vue";

import { matchScoutTable } from "@/lib/constants";
import { getMatchScoutSchema } from "@/lib/2025/match-scouting-form";
import { validateForm, parseScoutData, submitScoutData } from "@/lib/data-submission";
import { useEventStore } from "@/stores/event-store";

import "@material/web/button/filled-button";
</script>

<template>
    <div class="main-content">
        <h1>Match Scouting</h1>

        <form v-if="formLoaded">
            <FormSection v-for="section in scoutForm" :section-key="section.key" :name="section.name"
                :components="section.components" :color="getAllianceColor" @form-update="formValidation"></FormSection>
        </form>

        <div class="data-tile error-tile" v-if="formInvalid">
            <h1>^^^ Form is invalid. Please check the form for errors ^^^</h1>
        </div>
        <div class="data-tile success-tile" v-if="submitSuccess">
            <h1>Submitted successfully!</h1>
        </div>

        <div class="data-tile" v-if="submitFailed">
            <h1>DATA UPLOAD FAILED</h1>
            <h1>SCAN THIS QR CODE</h1>
            <QRCode :qr-data="submitData"></QRCode>


            <h3>Save this text to a file if a scanner is unavailable</h3>
            <p>
                {{ getSubmitDataString }}
            </p>
        </div>

        <div class="button-container" v-if="formLoaded && !isSubmitting">
            <md-filled-button v-on:click="submitForm">SUBMIT</md-filled-button>
            <md-filled-button v-on:click="resetFormData">RESET</md-filled-button>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    data() {
        return {
            eventStore: null,
            formLoaded: false,
            scoutForm: null,
            // Track data submission in order to fall back to QR code / copy text if it fails.
            submitData: {},
            submitFailed: false,
            submitSuccess: false,
            formInvalid: false,
            isSubmitting: false
        }
    },
    methods: {
        async loadScoutForm() {
            this.formLoaded = false;
            this.scoutForm = await getMatchScoutSchema();
            this.formLoaded = true;
        },
        formValidation() {
            // The form isn't invalid yet.
            this.formInvalid = false;

            const { data, valid } = validateForm(this.scoutForm);
            this.scoutForm = data;
            this.formInvalid = !valid;

            // reset the submit success flag because the form has changed and has not been submitted yet.
            this.submitSuccess = false;

            return valid;
        },
        async submitForm() {
            // Data submission hasn't failed or succeeded yet...
            this.submitFailed = false;
            this.submitSuccess = false;
            this.isSubmitting = true;

            // If the form isn't valid, wait for the user to fix it.
            if (!this.formValidation()) {
                this.isSubmitting = false;
                return;
            }

            // Parse the data to submit separately from the act of submitting the data to the database in case the connection fails.
            this.submitData = parseScoutData(this.scoutForm, this.eventStore.eventId)

            // Attempt to submit the data.
            const error = await submitScoutData(this.submitData, matchScoutTable);

            // Preserve some things that don't need to be re-entered.
            this.preserveSingleEntryData();

            // If the database submission failed, set the QR code to show and print the error.
            if (error) {
                console.log(error);
                this.submitFailed = true;
                this.isSubmitting = false;
                return;
            }


            // Reset all non-preserved data. This marks submitFailed as false and also submitSuccess as false. 
            // So we mark submitSuccess as true below to update the UI.
            this.resetFormData();

            // Mark the submission as successful and reset the submission data.
            this.submitSuccess = true;
            this.submitData = {};
            this.isSubmitting = false;
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
                    if (!component.incrementAfterSubmit) {
                        component.value = component.defaultValue;
                    } else {
                        component.value = component.value + 1;
                    }
                    component.error = false;
                })
            });

            // The form submission no longer has failed since the data is being reset.
            this.submitFailed = false;
            this.formInvalid = false;
            this.submitSuccess = false;
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
    },
    created() {
        this.eventStore = useEventStore();
        this.loadScoutForm();
    },
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

.error-tile {
    background-color: red;
    color: white;
}

.success-tile {
    background-color: green;
    color: white;
}
</style>
