<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import '@material/web/select/outlined-select';
</script>

<template>
    <md-outlined-select class="choice-select" v-bind:display-text="getActiveChoice.text">
        <md-select-option v-for="choice, idx in choices" v-bind:selected="choice.key == getActiveChoice.key"
            :key="choice.key" :ref="getActiveChoice.key" v-bind:aria-label="choice.text" @click="setChoice(idx)">
            <div slot="headline">{{ choice.text }}</div>
        </md-select-option>
    </md-outlined-select>
</template>

<script lang="ts">
export default {
    props: {
        choices: {
            default: []
        },
        modelValue: {
            required: true
        }
    },
    methods: {
        setChoice(idx: int) {
            this.$emit("update:modelValue", idx);
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
