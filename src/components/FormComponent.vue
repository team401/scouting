<script setup lang="ts">
// @ts-nocheck
import Dropdown from '@/components/Dropdown.vue';
import Switch from '@/components/Switch.vue';
import Number from '@/components/Number.vue';
import Counter from '@/components/Counter.vue';
import TextInput from '@/components/TextInput.vue';
import TextAreaInput from '@/components/TextAreaInput.vue';
</script>

<template>
    <div v-if="type == 'switch'">
        {{ label }}
        <Switch :model-value="modelValue" @update:modelValue='updateModel'></Switch>
    </div>
    <div v-else-if="type == 'optionswitch'">
        {{ options.unselected }}
        <Switch :model-value="modelValue" @update:modelValue='updateModel'></Switch>
        {{ options.selected }}
    </div>
    <div v-else-if="type == 'dropdown'">
        {{ label }}
        <Dropdown :choices="options.choices" :model-value="modelValue" @update:modelValue="updateModel"></Dropdown>
    </div>
    <div v-else-if="type == 'number'">
        <Number :model-value="modelValue" @update:modelValue="updateModel" :label="label"></Number>
    </div>
    <div v-else-if="type == 'counter'">
        <Counter :model-value="modelValue" @update:modelValue="updateModel" :label="label"></Counter>
    </div>
    <div v-else-if="type == 'text'">
        <TextInput :model-value="modelValue" @update:modelValue="updateModel" :label="label"></TextInput>
    </div>
    <div v-else-if="type == 'textarea'">
        <TextAreaInput :model-value="modelValue" @update:modelValue="updateModel" :label="label"></TextAreaInput>
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
        options: {
            default: {}
        },
        type: {
            default: ""
        }
    },
    methods: {
        updateModel(data) {
            this.$emit("update:modelValue", data);
        }
    }
}
</script>