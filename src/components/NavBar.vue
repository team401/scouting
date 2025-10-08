<script setup lang="ts">
// TODO: fix types
// @ts-nocheck

import { RouterLink } from 'vue-router';

import HamburgerMenu from '@/components/HamburgerMenu.vue';

import { useViewModeStore } from '@/stores/view-mode-store';
import { useEventStore } from '@/stores/event-store';
</script>

<template>
    <!-- Mobile navigation bar (hamburger menu) -->
    <div class="nav" v-if="viewMode?.isMobile">
        <HamburgerMenu>
            <template v-slot:menu-title>
                {{ eventName }}
            </template>
            <template v-slot:theme-button>
                <div class="nav-dark-mode nav-mobile-right" @click="toggleUserDarkMode">
                    <md-icon slot="icon" v-if="isDarkMode">dark_mode</md-icon>
                    <md-icon slot="icon" v-else>light_mode</md-icon>
                </div>
            </template>
            <template v-slot:menu-content>
                <RouterLink to="/scout" class="nav-link nav-link-mobile">Match Scouting</RouterLink>
                <RouterLink to="/pit-scout" class="nav-link nav-link-mobile">Pit Scouting</RouterLink>
                <RouterLink to="/event" class="nav-link nav-link-mobile">Event Analysis</RouterLink>
                <RouterLink to="/team" class="nav-link nav-link-mobile">Team Analysis</RouterLink>
                <RouterLink to="/match" class="nav-link nav-link-mobile">Match Preview</RouterLink>
                <RouterLink to="/picklist" class="nav-link nav-link-mobile">Pick List</RouterLink>
            </template>
        </HamburgerMenu>

    </div>
    <div class="nav" v-else>
        <RouterLink to="/scout" class="nav-link">Match Scouting</RouterLink>
        <RouterLink to="/pit-scout" class="nav-link">Pit Scouting</RouterLink>
        <RouterLink to="/event" class="nav-link">Event Analysis</RouterLink>
        <RouterLink to="/team" class="nav-link">Team Analysis</RouterLink>
        <RouterLink to="/match" class="nav-link">Match Preview</RouterLink>
        <RouterLink to="/picklist" class="nav-link">Pick List</RouterLink>

        <div class="nav-dark-mode nav-right" @click="toggleUserDarkMode">
            <md-icon slot="icon" v-if="isDarkMode">dark_mode</md-icon>
            <md-icon slot="icon" v-else>light_mode</md-icon>
        </div>
        <div class="nav-text nav-right">{{ eventName }}</div>
    </div>
</template>

<script lang="ts">
export default {
    props: {
        searchVisible: {
            default: true,
            type: Boolean
        }
    },
    data() {
        return {
            windowWidth: window.innerWidth,
            viewMode: null,
            eventStore: null
        }
    },
    created() {
        this.viewMode = useViewModeStore();
        this.eventStore = useEventStore();
    },
    computed: {
        eventName() {
            return this.eventStore?.eventName;
        },
        isDarkMode() {
            return this.viewMode.isDarkMode;
        }
    },
    methods: {
        toggleUserDarkMode() {
            this.viewMode.toggleUserDarkMode();
        }
    }
}
</script>

<style scoped>
div.nav {
    background-color: var(--header-color);
    color: var(--primary-text-color);
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    width: 100%;
    height: 65px;
    position: fixed;
    display: block;
}


a.nav-link {
    /* Color transitions */
    transition: color .5s ease;
    transition: background-color .5s ease;
    -ms-transition: color .5s ease;
    -ms-transition: background-color .5s ease;
    -moz-transition: color .5s ease;
    -moz-transition: background-color .5s ease;
    -webkit-transition: color .5s ease;
    -webkit-transition: background-color .5s ease;

    /* Border transitions */
    /* -webkit-transition: border .5s ease;
    -moz-transition: border .5s ease;
    transition: border .5s ease; */

    /* Positioning */
    position: relative;
    margin: 0 auto;
    float: left;
    display: flex;
    justify-content: center;
    align-items: center;

    /* Sizing */
    font-size: 16px;
    height: 100%;
    text-align: center;
    margin: 0 auto;
    padding-left: 10px;
    padding-right: 10px;

    /* Text */
    text-decoration: none;
}


a.nav-link:link,
a.nav-link:visited {
    background-color: var(--header-color);
    color: #FFF;
    border-bottom: var(--header-color) 5px solid;
}

a.nav-link:hover,
a.nav-link:active {
    background-color: var(--header-hover-color);
    color: #FFF;
    border-bottom: var(--primary-color) 5px solid;
}

a.nav-link-mobile {
    width: 100%;
    padding: 15px;
}

.nav-right {
    display: flex;
    align-items: center;
    float: right;
    position: relative;
    height: 100%;
    background-color: var(--accent-color);
    padding: 20px;
}

.nav-mobile-right {
    display: flex;
    align-items: center;
    float: right;
    position: relative;
    height: 100%;
    padding: 20px;
}

.nav-text {
    font-size: 16px;
    text-decoration: none;
    color: #FFF;
}

.nav-dark-mode {
    background-color: var(--primary-color);
    color: var(--primary-text-color);
    cursor: pointer;
}
</style>