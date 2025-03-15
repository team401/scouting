<script setup lang="ts">
// @ts-nocheck
import { getRankedStyle, getRanking } from "@/lib/2025/data-visualization";
</script>

<template>
    <div :class="highlightClass">
        <div v-for="stat in stats" class="stat-highlight-container">
            <h3>{{ stat.name }}</h3>
            <div class="stat-highlight-value">
                {{ stat.value }} (<span :style="getRankedStyle(stat.normalized)">{{ getRanking(stat.ranking) }}</span>)
            </div>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    props: {
        stats: {
            default: []
        },
        isVertical: {
            default: false
        }
    },
    computed: {
        highlightClass() {
            if (this.isVertical) {
                return "stat-highlight-view-container-vertical";
            }
            return "stat-highlight-view-container";
        },
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

.stat-highlight-view-container-vertical {
    display: flex;
    flex-direction: column;
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