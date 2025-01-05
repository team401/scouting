<script setup lang="ts">
// @ts-nocheck

import Counter from '@/components/Counter.vue';
</script>

<template>
    <div class="counter-stack-container">
        {{ label }}
        <div v-for="val, idx in modelValue" class="counter-container">
            <div class="counter-container">
                <span class="label-container">{{ subLabels[idx] }}</span>
                <Counter :model-value="val" @update:modelValue="updateModel($event, idx)"></Counter>
            </div>
        </div>
    </div>
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
        subLabels: {
            default: []
        },
    },
    computed: {
    },
    methods: {
        updateModel(data, idx) {
            var stackedValues = this.modelValue;
            stackedValues[idx] = data;
            this.$emit('update:modelValue', stackedValues);
        }
    }
}
</script>

<style scoped>
.counter-stack-container {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.counter-container {
    display: flex;
    flex-direction: row;
    align-items: safe center;
}

.label-container {
    margin: 15px;
}
</style>