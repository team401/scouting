<script setup lang="ts">
// @ts-nocheck
import "@material/web/button/elevated-button";
</script>

<template>
    <div class="counter-view-container">
        {{ label }}
        <div class="counter-container">
            <md-elevated-button @click="decrementCount">-</md-elevated-button>
            <span class="count-number">{{ getCount }}</span>
            <md-elevated-button @click="incrementCount">+</md-elevated-button>
        </div>
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
        min: {
            default: 0
        }
    },
    computed: {
        getCount() {
            return this.modelValue;
        }
    },
    methods: {
        incrementCount(event) {
            // Prevent the form from submitting when incrementing.
            event.preventDefault();
            this.$emit('update:modelValue', this.modelValue + 1);
        },
        decrementCount(event) {
            // Prevent the form from submitting when decrementing.
            event.preventDefault();

            // Prevent decrementing below the min value.
            if (this.modelValue == this.min) {
                return;
            }

            this.$emit('update:modelValue', this.modelValue - 1);
        }
    }
}
</script>

<style scoped>
.counter-view-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: fit-content;
}

.counter-container {
    display: flex;
    align-items: center;
}

span.count-number {
    margin: 10px;
}
</style>