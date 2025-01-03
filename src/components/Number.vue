<script setup lang="ts">
// @ts-nocheck
import "@material/web/textfield/outlined-text-field";
</script>

<template>
    <md-outlined-text-field v-on:input="updateNumber" type="number" v-bind:value="modelValue" noSpinner="true"
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
        updateNumber(event) {
            this.$emit('update:modelValue', Number(event.target.value));
        }
    }
}
</script>