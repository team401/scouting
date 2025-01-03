<script setup lang="ts">
// 
import "@material/web/switch/switch";
</script>

<template>
    <md-switch @input="updateSwitch" v-bind:selected="isSelected"></md-switch>
</template>

<script lang="ts">
export default {
    props: {
        modelValue: {}
    },
    computed: {
        isSelected() {
            return this.modelValue;
        }
    },
    methods: {
        updateSwitch() {
            this.$emit('update:modelValue', !this.modelValue);
        }
    }
}
</script>