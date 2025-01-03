<script setup lang="ts">
// @ts-nocheck
import "@material/web/textfield/outlined-text-field";
</script>

<template>
    <md-outlined-text-field v-on:input="updateText" type="textarea" v-bind:value="modelValue"
        :label="label"></md-outlined-text-field>
</template>

<script lang="ts">
export default {
    props: {
        modelValue: {
            required: true
        },
        label: {
            default: ""
        }
    },
    computed: {
        currentNumber() {
            return this.modelValue;
        }
    },
    methods: {
        updateText(event) {
            this.$emit('update:modelValue', event.target.value);
        }
    }
}
</script>