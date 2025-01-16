<script setup lang="ts">
// @ts-nocheck
import Dropdown from '@/components/Dropdown.vue';
import Switch from '@/components/Switch.vue';
import Number from '@/components/Number.vue';
import Counter from '@/components/Counter.vue';
import RadioButtons from '@/components/RadioButtons.vue';
import StackedCounter from '@/components/StackedCounters.vue';
import TextInput from '@/components/TextInput.vue';
import TextAreaInput from '@/components/TextAreaInput.vue';
import GridCounter from '@/components/GridCounters.vue';
</script>

<template>
    <div v-if="type == 'switch'">
        <div class="data-entry-container">
            {{ label }}
            <Switch :model-value="modelValue" @update:modelValue='updateModel' class="switch" :required="required"></Switch>
        </div>
    </div>
    <div v-else-if="type == 'optionswitch'">
        <div class="input-container">
            <div class="label-container">
                {{ label }}
            </div>
            <div class="data-entry-container">
                {{ options.unselected }}
                <Switch :model-value="modelValue" @update:modelValue='updateModel' :selected-color="options?.selectedColor"
                    :unselected-color="options?.unselectedColor" class="switch"></Switch>
                {{ options.selected }}
            </div>
        </div>
    </div>
    <div v-else-if="type == 'dropdown'">
        {{ label }}
        <Dropdown :choices="options.choices" :model-value="modelValue" @update:modelValue="updateModel" :required="required"
            :error="error"></Dropdown>
    </div>
    <div v-else-if="type == 'radio'">
        <RadioButtons :choices="options.choices" :model-value="modelValue" :label="label" @update:modelValue="updateModel"
            :required="required" :error="error" :is-vertical="options?.isVertical">
        </RadioButtons>
    </div>
    <div v-else-if="type == 'number'">
        <Number :model-value="modelValue" @update:modelValue="updateModel" :label="label" :required="required"
            :error="error"></Number>
    </div>
    <div v-else-if="type == 'counter'">
        <Counter :model-value="modelValue" @update:modelValue="updateModel" :label="label"></Counter>
    </div>
    <div v-else-if="type == 'stacked-counters'">
        <StackedCounter :model-value="modelValue" @update:modelValue="updateModel" :label="label"
            :sub-labels="options.labels">
        </StackedCounter>
    </div>
    <div v-else-if="type == 'grid-counters'">
        <GridCounter :model-value="modelValue" @update:modelValue="updateModel" :label="label" :sub-labels="options.labels"
            :sections="options?.sections">
        </GridCounter>
    </div>
    <div v-else-if="type == 'text'">
        <TextInput :model-value="modelValue" @update:modelValue="updateModel" :label="label" :required="required"
            :error="error">
        </TextInput>
    </div>
    <div v-else-if="type == 'textarea'">
        <TextAreaInput :model-value="modelValue" @update:modelValue="updateModel" :label="label" :required="required"
            :error="error">
        </TextAreaInput>
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
        },
        required: {
            default: false
        },
        error: {
            default: false
        }
    },
    methods: {
        updateModel(data) {
            this.$emit("update:modelValue", data);
        }
    }
}
</script>

<style scoped>
.input-container {
    display: flex;
    align-items: center;
    flex-direction: column;
}

.data-entry-container {
    display: flex;
    align-items: center;
    flex-direction: row;
}

.label-container {
    display: flex;
    align-items: center;
}

.switch {
    margin-left: 10px;
    margin-right: 10px;
}
</style>