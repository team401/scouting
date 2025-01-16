<script setup lang="ts">
// @ts-nocheck
import "@material/web/textfield/outlined-text-field";
</script>

<template>
    <md-outlined-text-field v-on:input="updateText" type="text" v-bind:value="modelValue" :label="label"
        :required="required" :error="error" error-text="This field is required"></md-outlined-text-field>
</template>

<script lang="ts">
export default {
    props: {
        modelValue: {
            required: true
        },
        label: {
            default: ""
        },
        required: {
            default: false
        },
        error: {
            default: false
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