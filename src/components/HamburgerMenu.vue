<script setup lang="ts">

import { Transition } from 'vue';

import '@material/web/icon/icon';

</script>

<template>
    <div class="hamburger-container">
        <div class="menu-title">
            <slot name="menu-title"></slot>
        </div>
        <div class="hamburger-button-container">
            <a class="hamburger-button" v-if="enabled" @click="expanded = !expanded">
                <md-icon slot="icon" v-if="expanded">close </md-icon>
                <md-icon slot="icon" v-if="!expanded">menu</md-icon>
            </a>
        </div>

        <slot name="theme-button"></slot>
        <Transition name="slide">
            <div class="hamburger-menu-container" v-if="expanded" @click="expanded = false">
                <slot name="menu-content"></slot>
            </div>
        </Transition>
    </div>
</template>

<script lang="ts">
export default {
    props: {
        enabled: {
            default: true,
            type: Boolean
        }
    },
    data() {
        return {
            expanded: false
        }
    }
}
</script>

<style scoped>
.hamburger-container {
    display: block;
    min-height: 65px;
    width: 100%;
}

.hamburger-button-container {
    /* Height and width chosen to match title bar height and be a square */
    height: 65px;
    width: 65px;
    position: relative;
    float: right;
    /* display: inline-block; */
}

.hamburger-button {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFF;
    height: 100%;
    width: 100%;
}

.hamburger-button:hover {
    background-color: var(--bbq-header-hover-color);
    cursor: pointer;
}

.hamburger-menu-container {
    transition: background-color .5s ease;
    background-color: var(--bbq-header-color);
    display: inline-block;
    height: fit-content;
    width: 100%;
}

/* Transition styling */
.slide-enter-active,
.slide-leave-active {
    transition: all 0.3s ease-out;
}

.slide-enter-from,
.slide-leave-to {
    opacity: 0;
}

.menu-title {
    position: absolute;
    display: flex;
    align-items: center;
    color: #FFF;
    padding: 20px;
}
</style>
