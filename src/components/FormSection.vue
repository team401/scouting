<script setup lang="ts">
// @ts-nocheck
import FormComponent from './FormComponent.vue';
</script>

<template>
    <div class="data-tile">
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
        }
    }
}
</script>

<style scoped>
div {
    margin: 15px;
}
</style>