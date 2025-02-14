<script setup lang="ts">
// @ts-nocheck
</script>

<template>
    <div class="stat-highlight-view-container">
        <div v-for="stat in stats" class="stat-highlight-container">
            <h3>{{ stat.name }}</h3>
            <div class="stat-highlight-value">
                {{ stat.value }}
            </div>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    props: {
        stats: {
            default: []
        }
    },
    computed: {
    },
    methods: {
    }
}
</script>

<style scoped>
.stat-highlight-view-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    text-align: center;
    justify-content: safe center;
    flex-wrap: wrap;
}

.stat-highlight-container {
    display: flex;
    align-items: center;
    flex-direction: column;
    margin: 15px;
}

.stat-highlight-value {
    margin: 10px;
}
</style>