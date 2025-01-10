<script setup lang="ts">
// @ts-nocheck

import Counter from '@/components/Counter.vue';
</script>

<template>
    <div>
        <u>{{ label }}</u>
        <table>
            <thead>
                <th></th>
                <th v-for="section, sIdx in sections">{{ section.text }}</th>
            </thead>
            <tr v-for="row, vIdx in modelValue">
                <td>
                    <span class="label-container">{{ subLabels[vIdx] }}</span>
                </td>
                <td v-for="section, sIdx in sections">
                    <Counter :model-value="row[sIdx]" @update:modelValue="updateModel($event, vIdx, sIdx)"></Counter>
                </td>
            </tr>
        </table>
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
        sections: {
            default: []
        }
    },
    computed: {
    },
    methods: {
        updateModel(data, col, row) {
            var stackedValues = this.modelValue;
            stackedValues[col][row] = data;
            this.$emit('update:modelValue', stackedValues);
        }
    }
}
</script>

<style scoped>
div {
    display: flex;
    align-items: center;
}

.label-container {
    margin: 15px;
}

table {
    border-collapse: collapse;
    box-shadow: none;
}

td {
    padding: 8px 10px;
}
</style>