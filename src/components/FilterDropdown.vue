<script setup lang="ts">
// TODO: fix types
// @ts-nocheck
</script>

<template>
    <md-outlined-select class="filter-select" v-bind:display-text="getActiveFilter.text">
        <md-select-option v-for="filter, idx in filters" v-bind:selected="filter.key == getActiveFilter.key"
            :key="filter.key" :ref="getActiveFilter.key" v-bind:aria-label="filter.text" @click="setFilter(idx)">
            <div slot="headline">{{ filter.text }}</div>
        </md-select-option>
    </md-outlined-select>
</template>

<script lang="ts">
export default {
    props: {
        filters: {
            default: []
        }
    },
    data() {
        return {
            activeFilterIndex: 0
        }
    },
    methods: {
        setFilter(idx: int) {
            this.activeFilterIndex = idx;
            this.$emit("filter-selected", idx);
        }
    },
    computed: {
        getActiveFilter() {
            // If the active filter index is out of bounds, return an empty object just to prevent the caller from crashing.
            if (this.activeFilterIndex >= this.filters.length) {
                return {};
            }
            return this.filters[this.activeFilterIndex];
        },
    }
}
</script>