<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import '@material/web/radio/radio';
</script>

<template>
    <span v-if="required">{{ label }}*</span>
    <span v-else>{{ label }}</span>

    <div class="radio-group-container" v-if="isVertical">
        <div v-for="choice in choices" class="radio-input-container">
            <md-radio :name="label" :value="choice.key" v-bind:checked="isChecked(choice.key)" @input="setChoice"
                :required="required" :class="getRadioClass"></md-radio>
            <span>{{ choice.text }}</span>
        </div>
    </div>
    <div v-else>
        <table>
            <thead>
                <tr>
                    <th v-for="choice in choices">
                        {{ choice.text }}
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td v-for="choice in choices">
                        <md-radio :name="label" :value="choice.key" v-bind:checked="isChecked(choice.key)" @input="setChoice"
                            :required="required" :class="getRadioClass"></md-radio>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script lang="ts">
export default {
    props: {
        choices: {
            default: []
        },
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
        },
        isVertical: {
            default: true
        }
    },
    methods: {
        setChoice(event: int) {
            this.$emit("update:modelValue", event.target.value);
        },
        isChecked(key: String) {
            return key == this.modelValue;
        }
    },
    computed: {
        getActiveChoice() {
            // If the active choice index is out of bounds, return an empty object just to prevent the caller from crashing.
            if (this.modelValue >= this.choices.length) {
                return {};
            }
            return this.choices[this.modelValue];
        },
        getRadioClass() {
            if (this.error) {
                return "radio-error";
            }
            return "";
        }
    }
}
</script>

<style scoped>
.radio-group-container {
    display: flex;
    flex-direction: column;
}

.radio-input-container {
    display: flex;
    align-items: center;
    flex-direction: row;
}

.radio-error {
    border: 3px solid red;
}

span {
    margin: 10px;
}

table {
    border-collapse: collapse;
    box-shadow: none;
}

td {
    padding: 8px 10px;
}
</style>
