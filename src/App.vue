<script setup lang="ts">
import { RouterView } from "vue-router";
import { useViewModeStore } from '@/stores/view-mode-store';
import { useEventStore } from '@/stores/event-store';
import NavBar from "./components/NavBar.vue";

// Keep track of the view mode based on screen width.
const viewMode = useViewModeStore();
window.addEventListener('resize', () => {
  viewMode.updateScreenWidth(window.innerWidth);
  viewMode.updateScreenHeight(window.innerHeight);
})
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  viewMode.updateDarkMode();
})
viewMode.updateDarkMode();

const eventStore = useEventStore();
eventStore.updateEvent();
</script>

<template>
  <NavBar></NavBar>
  <RouterView />
</template>



<style scoped></style>
