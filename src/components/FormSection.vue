<script setup lang="ts">
// @ts-nocheck
import FormComponent from './FormComponent.vue';
</script>

<template>
    <div class="data-tile" :style="getStyle">
        <h2>{{ name }}</h2>
        <div v-for="component in components" v-if="components.length > 0">
            <FormComponent :label="component.label" :type="component.type" :options="component.options"
                v-model="component.value"></FormComponent>
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
            }

            return "border: 3px solid " + color;
        }
    }
}
</script>

<style scoped>
div {
    margin: 15px;
}
</style>