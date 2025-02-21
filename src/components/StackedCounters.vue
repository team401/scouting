<script setup lang="ts">
// @ts-nocheck

import Counter from '@/components/Counter.vue';
</script>

<template>
    <div>
        <u>{{ label }}</u>
        <table>
            <tr v-for="val, idx in modelValue">
                <td>
                    <span class="label-container">{{ subLabels[idx] }}</span>
                </td>
                <td>
                    <Counter :model-value="val" @update:modelValue="updateModel($event, idx)"></Counter>
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
}

td {
    padding: 8px 10px;
}
</style>