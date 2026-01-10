<script setup lang="ts">
// @ts-nocheck
import { ref, computed, watch, nextTick } from 'vue';
import '@material/web/textfield/outlined-text-field';
import '@material/web/list/list';
import '@material/web/list/list-item';
import "@/lib/theme";

const props = defineProps({
  choices: { type: Array, default: () => [] },
  modelValue: { type: [Number, String], required: true },
  error: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue']);
const searchQuery = ref('');
const isOpen = ref(false);
const highlightedIndex = ref(0);

const filteredChoices = computed(() =>
  props.choices.filter(choice =>
    choice.text.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
);

watch(
  () => props.modelValue,
  newVal => {
    const active = props.choices[newVal];
    searchQuery.value = active ? active.text : '';
  },
  { immediate: true }
);

function selectChoice(index: number) {
  emit('update:modelValue', props.choices.indexOf(filteredChoices.value[index]));
  searchQuery.value = filteredChoices.value[index].text;
  isOpen.value = false;
}

function handleInputChange() {
  const match = props.choices.find(
    c => c.text.toLowerCase() === searchQuery.value.toLowerCase()
  );
  if (match) emit('update:modelValue', props.choices.indexOf(match));
}

function handleFocus() {
  nextTick(() => (isOpen.value = true));
}

function handleBlur(e: FocusEvent) {
  const related = e.relatedTarget as HTMLElement;
  if (related && related.closest('.autocomplete-list')) return;
  isOpen.value = false;
}
</script>

<template>
  <div class="autocomplete-container">
    <div class="autocomplete-wrapper">
      <md-outlined-text-field
        v-model="searchQuery"
        :error="error"
        label="Scout Name"
        inputmode="text"
        @focus="handleFocus"
        @input="isOpen = true"
        @blur="handleBlur"
      />

      <transition name="fade">
        <md-list
          v-if="isOpen && filteredChoices.length > 0"
          class="autocomplete-list"
        >
          <md-list-item
            v-for="(choice, idx) in filteredChoices"
            :key="choice.key"
            :tabindex="0"
            :class="{ highlighted: idx === highlightedIndex }"
            @mousedown.prevent="selectChoice(idx)"
          >
            {{ choice.text }}
          </md-list-item>
        </md-list>
      </transition>
    </div>
  </div>
</template>

<style scoped>
/* Centering container */
.autocomplete-container {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* Wrapper for width & positioning */
.autocomplete-wrapper {
  position: relative;
  width: 100%;
  max-width: 220px; /* slightly narrower */
  margin: 0 auto;
}

/* Compact text field */
md-outlined-text-field {
  width: 100%;
  --md-outlined-text-field-container-padding: 0.2rem 0.6rem;
  --md-outlined-field-container-shape: 6px;
  --md-outlined-text-field-input-text-size: 0.9rem;
}

/* Dropdown */
.autocomplete-list {
  position: absolute;
  top: calc(100% + 3px);
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  z-index: 1000;
  background-color: #1e1e1e;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  max-height: 160px; /* smaller */
  overflow-y: auto;
  border-radius: 8px;
  padding: 2px 0;
  -webkit-overflow-scrolling: touch;
}

/* Compact list items */
md-list-item {
  padding: 8px 14px;
  font-size: 15px;
  line-height: 1.3;
}

.highlighted {
  background-color: #c78000 !important;
  color: #fff;
}

/* Subtle fade transition */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.12s ease-in-out;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 480px) {
  .autocomplete-wrapper {
    max-width: 90%;
  }
  md-list-item {
    padding: 10px 16px;
  }
}
</style>
