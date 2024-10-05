<script setup lang="ts">
import { RouterView } from "vue-router";
import { useViewModeStore } from '@/stores/view-mode-store';
import NavBar from "./components/NavBar.vue";

// Keep track of the view mode based on screen width.
const viewMode = useViewModeStore();
window.addEventListener('resize', () => {
  viewMode.updateScreenWidth(window.innerWidth);
})
</script>

<template>
  <NavBar></NavBar>
  <RouterView />
</template>

<style scoped></style>
