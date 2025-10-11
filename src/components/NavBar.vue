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
         <RouterLink to="/pit-scout" class="nav-link nav-link-mobile">Pit Scouting</RouterLink>
                <RouterLink to="/event" class="nav-link nav-link-mobile">Event Analysis</RouterLink>
                <RouterLink to="/team" class="nav-link nav-link-mobile">Team Analysis</RouterLink>
                <RouterLink to="/match" class="nav-link nav-link-mobile">Match Analysis</RouterLink>
                <RouterLink to="/matchPreview" class="nav-link nav-link-mobile">Match Preview</RouterLink>
      </template>
    </HamburgerMenu>
  </div>

  <!-- Desktop navigation -->
  <div class="nav" v-else>
    <RouterLink to="/scout" class="nav-link">Match Scouting</RouterLink>
    <RouterLink to="/pit-scout" class="nav-link">Pit Scouting</RouterLink>
    <RouterLink to="/matchPreview" class="nav-link">Match Preview</RouterLink>

    <!-- Dropdown (Analysis group) -->
    <div class="dropdown" ref="analysisDropdown">
      <button
        class="nav-link dropdown-btn"
        type="button"
        @click.stop="toggleAnalysisDesktop"
        :aria-expanded="analysisDesktopOpen ? 'true' : 'false'"
      >
        Analysis ▾
      </button>

      <div class="dropdown-content" v-show="analysisDesktopOpen">
        <RouterLink to="/team" class="dropdown-link" @click="closeAnalysisMenus">Team Analysis</RouterLink>
        <RouterLink to="/event" class="dropdown-link" @click="closeAnalysisMenus">Event Analysis</RouterLink>
        <RouterLink to="/match" class="dropdown-link" @click="closeAnalysisMenus">Match Analysis</RouterLink>
      </div>
    </div>


    <div class="nav-dark-mode nav-right" @click="toggleUserDarkMode">
      <md-icon slot="icon" v-if="isDarkMode">dark_mode</md-icon>
      <md-icon slot="icon" v-else>light_mode</md-icon>
    </div>
    <div class="nav-text nav-right">{{ eventName }}</div>
  </div>
</template>

<script lang="ts">
export default {
  data() {
    return {
      viewMode: null,
      eventStore: null,
      analysisDesktopOpen: false,
      analysisMobileOpen: false
    };
  },
  created() {
    this.viewMode = useViewModeStore();
    this.eventStore = useEventStore();
  },
  methods: {
    toggleUserDarkMode() {
      this.viewMode.toggleUserDarkMode();
    },
    toggleAnalysisDesktop() {
      this.analysisDesktopOpen = !this.analysisDesktopOpen;
    },
    toggleAnalysisMobile() {
      this.analysisMobileOpen = !this.analysisMobileOpen;
    },
    // 🟢 This closes both menus ONLY when navigating to a page
    closeAnalysisMenus() {
      this.analysisDesktopOpen = false;
      this.analysisMobileOpen = false;
    }
  },
  computed: {
    eventName() {
      return this.eventStore?.eventName;
    },
    isDarkMode() {
      return this.viewMode.isDarkMode;
    }
  }
};
</script>

<style scoped>
/* --- outer nav sizing --- */
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

/* --- base nav-link styles (apply to <a> and <button>) --- */
.nav-link {
  transition: color .25s ease, background-color .25s ease;
  position: relative;
  margin: 0 auto;
  float: left;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 16px;
  height: 100%;
  text-align: center;
  padding-left: 10px;
  padding-right: 10px;
  text-decoration: none;
  background-color: var(--header-color);
  color: #FFF;
  border: none;
  cursor: pointer;
  border-bottom: var(--header-color) 5px solid;
}

/* anchor-specific (visited/link states) still honored for <a> */
.nav-link:link,
.nav-link:visited {
  color: #FFF;
  text-decoration: none;
}

.nav-link:hover,
.nav-link:active {
  background-color: var(--header-hover-color);
  color: #FFF;
  border-bottom: var(--primary-color) 5px solid;
}

/* --- mobile link tweaks --- */
.nav-link.nav-link-mobile {
  width: 100%;
  padding: 15px;
  box-sizing: border-box;
  float: none; /* in hamburger menu, don't float */
  justify-content: flex-start;
}

/* submenu inside mobile menu */
.nav-submenu {
  display: flex;
  flex-direction: column;
  padding-left: 15px;
  background-color: transparent;
}

/* submenu links (slightly indented) */
.submenu-link {
  font-size: 15px;
  padding-left: 10px;
}

/* --- right side items --- */
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

/* --- desktop dropdown specifics --- */
.dropdown {
  position: relative;
  float: left;
  height: 100%;
  display: inline-block;
}

.dropdown-btn {
  padding-left: 10px;
  padding-right: 10px;
}

.dropdown-content {
  display: flex;
  position: absolute;
  top: 65px;
  left: 0;
  min-width: 200px;
  z-index: 10000;
  background-color: var(--header-color);
  border-radius: 6px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.35);
  flex-direction: column;
  padding: 0px 0;
}

/* dropdown links */
.dropdown-link {
  display: block;
  padding: 10px 16px;
  color: #FFF;
  text-decoration: none;
  font-size: 15px;
  white-space: nowrap;
}

.dropdown-link:hover {
  background-color: var(--header-hover-color);
  color: #FFF;
}
</style>
