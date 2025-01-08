<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import '@material/web/radio/radio';
</script>

<template>
    <div class="radio-group-container">
        <div v-for="choice in choices" class="radio-input-container">
            <md-radio :name="label" :value="choice.key" v-bind:checked="isChecked(choice.key)"
                @input="setChoice"></md-radio>
            <span>{{ choice.text }}</span>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    props: {
        choices: {
            default: []
        },
        modelValue: {
            required: true
        },
        label: {}
    },
    methods: {
        setChoice(event: int) {
            this.$emit("update:modelValue", event.target.value);
        },
        isChecked(key: String) {
            return key == this.modelValue;
        }
    },
    computed: {
        getActiveChoice() {
            // If the active choice index is out of bounds, return an empty object just to prevent the caller from crashing.
            if (this.modelValue >= this.choices.length) {
                return {};
            }
            return this.choices[this.modelValue];
        },
    }
}
</script>

<style scoped>
.radio-group-container {
    display: flex;
    flex-direction: column;
}

.radio-input-container {
    display: flex;
    align-items: center;
    flex-direction: row;
}

span {
    margin: 10px;
}
</style>