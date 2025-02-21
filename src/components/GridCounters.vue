<script setup lang="ts">
// @ts-nocheck

import Counter from '@/components/Counter.vue';
</script>

<template>
    <div>
        <table>
            <thead>
                <th><u>{{ label }}</u></th>
                <th class="th-counters" v-for="section, sIdx in sections">
                    {{ section.text }}
                </th>
            </thead>
            <tr v-for="row, vIdx in modelValue">
                <td class="td-label">
                    <span class="label-container">{{ subLabels[vIdx] }}</span>
                </td>
                <td class="td-counters" v-for="section, sIdx in sections">
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
    flex-direction: column;
}

.label-container {
    margin: 15px;
}

table {
    border-collapse: collapse;
    box-shadow: none;
    display: block;
}

td.td-counters {
    padding: 8px 0px;
    width: fit-content;
}

th.th-counters {
    padding: 8px 0px;
    width: fit-content;
    text-align: center;
}
</style>