<script setup lang="ts">
// @ts-nocheck
import FormComponent from './FormComponent.vue';
</script>

<template>
    <div class="scout-form-tile" :style="getStyle">
        <h2>{{ name }}</h2>
        <div v-for="component in components" v-if="components.length > 0">
            <FormComponent :label="component.label" :type="component.type" :options="component?.options"
                v-model="component.value" :required="component?.required" :error="component?.error"
                @update:modelValue="notifyInput">
            </FormComponent>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    props: {
        sectionKey: {
            default: ""
        },
        name: {
            default: ""
        },
        components: {
            default: []
        },
        color: {
            default: "red"
        }
    },
    computed: {
        getStyle() {
            var color = "#FF0000";
            if (this.color == "blue") {
                color = "#0000FF";
            } else if (this.color == "gray") {
                color = "#333";
            }

            return "border: 3px solid " + color;
        }
    },
    methods: {
        notifyInput() {
            this.$emit("form-update", true);
        }
    }
}
</script>

<style scoped>
div {
    margin-top: 15px;
    display: flex;
    flex-direction: column;
    align-items: safe center;
    justify-content: safe center;
    width: 100%;
}
</style>