<script setup lang="ts">
// @ts-nocheck
import { getNumberWithOrdinal } from "@/lib/util";
</script>

<template>
    <div :class="highlightClass">
        <div v-for="stat in stats" class="stat-highlight-container">
            <h3>{{ stat.name }}</h3>
            <div class="stat-highlight-value">
                {{ stat.value }} (<span :style="getRankedStyle(stat)">{{ getRanking(stat) }}</span>)
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
        getRanking(stat) {
            return getNumberWithOrdinal(stat.ranking);
        },
        getRankedStyle(stat) {
            const greenLimit = 0.33;
            const redLimit = 0.6;
            const baseColor = 100;
            const maxColor = 255;
            const multiplier = maxColor - baseColor;

            let style = {};

            // Teams in the top part get a increasingly dark green number as they get closer to the top.
            if (stat.normalized < greenLimit) {
                let greenColor = multiplier * ((greenLimit - stat.normalized) / greenLimit) + baseColor;
                style.color = "rgb(0, " + greenColor + ", 0)";
                style["font-weight"] = "bold";

            } else if (stat.normalized > redLimit) {
                // Teams in the bottom part get an increasingly dark red number as they get closer to the bottom.
                let redColor = multiplier * (stat.normalized - redLimit) / (1.0 - redLimit) + baseColor;
                style.color = "rgb(" + redColor + ", 0, 0)";
                style["font-weight"] = "bold";
            }

            return style;
        }
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