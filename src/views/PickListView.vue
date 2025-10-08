```vue
<template>
  <div class="picklist-view">
    <h2>Event Picklist</h2>

    <draggable
      v-model="teams"
      item-key="team_number"
      @end="onReorder"
      class="picklist-container"
    >
      <template #item="{ element, index }">
        <div class="team-card">
          <span class="rank">{{ index + 1 }}</span>
          <span class="team-number">Team {{ element.team_number }}</span>
          <span class="team-name">{{ element.nickname }}</span>
        </div>
      </template>
    </draggable>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck

import draggable from 'vuedraggable';
import { ref } from 'vue';

// Sample mock data
const teams = ref([
  { team_number: 254, nickname: 'The Cheesy Poofs' },
  { team_number: 1678, nickname: 'Citrus Circuits' },
  { team_number: 2056, nickname: 'OP Robotics' },
  { team_number: 1114, nickname: 'Simbotics' },
  { team_number: 118, nickname: 'Robonauts' },
  { team_number: 971, nickname: 'Spartan Robotics' },
]);

function onReorder() {
  console.log('New order:', teams.value.map((t) => t.team_number));
}
</script>

<style scoped>
.picklist-view {
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
  text-align: center;
}

.picklist-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.team-card {
  background: #1e1e1e;
  color: #f0f0f0;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 0.7rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: grab;
  transition: transform 0.1s ease, background 0.1s ease;
}

.team-card:active {
  cursor: grabbing;
  background: #2b2b2b;
  transform: scale(1.02);
}

.rank {
  font-weight: bold;
  color: #ffcc00;
  width: 2rem;
  text-align: right;
}

.team-number {
  flex: 1;
  text-align: left;
  margin-left: 1rem;
  font-weight: 500;
}

.team-name {
  color: #bbb;
  font-style: italic;
}
</style>
```
