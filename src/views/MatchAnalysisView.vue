<template>
  <div class="p-4">
    <h1 class="text-xl font-bold mb-4">Match Analysis</h1>

    <table class="table-auto border-collapse border border-gray-400 w-full">
      <thead>
        <tr class="bg-gray-200">
          <th class="border border-gray-400 px-2 py-1">Match</th>
          <th v-for="n in 3" :key="'blue'+n" class="border border-gray-400 px-2 py-1">Blue {{ n }}</th>
          <th v-for="n in 3" :key="'red'+n" class="border border-gray-400 px-2 py-1">Red {{ n }}</th>
          <th class="border border-gray-400 px-2 py-1">Blue Score</th>
          <th class="border border-gray-400 px-2 py-1">Red Score</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="match in matches" :key="match.matchNumber">
          <td class="border border-gray-400 px-2 py-1 font-semibold">{{ match.matchNumber }}</td>

          <!-- Blue alliance -->
          <td
            v-for="team in (match.Blue?.teams || [])"
            :key="'blue-'+team"
            class="border border-gray-400 px-2 py-1"
          >
            <RouterLink
              :to="`/team/${team}`"
              class="team-link text-blue-600 font-medium hover:underline"
            >
              {{ team }}
            </RouterLink>
          </td>
          <!-- Fill empty columns -->
          <td
            v-for="_ in Math.max(0, 3 - (match.Blue?.teams?.length || 0))"
            :key="'blue-empty-' + _"
            class="border border-gray-400 px-2 py-1"
          ></td>

          <!-- Red alliance -->
          <td
            v-for="team in (match.Red?.teams || [])"
            :key="'red-'+team"
            class="border border-gray-400 px-2 py-1"
          >
            <RouterLink
              :to="`/team/${team}`"
              class="team-link text-red-600 font-medium hover:underline"
            >
              {{ team }}
            </RouterLink>
          </td>
          <!-- Fill empty columns -->
          <td
            v-for="_ in Math.max(0, 3 - (match.Red?.teams?.length || 0))"
            :key="'red-empty-' + _"
            class="border border-gray-400 px-2 py-1"
          ></td>

          <!-- Scores -->
          <td class="border border-gray-400 px-2 py-1 font-semibold text-blue-700">
            {{ match.Blue?.score ?? 0 }}
          </td>
          <td class="border border-gray-400 px-2 py-1 font-semibold text-red-700">
            {{ match.Red?.score ?? 0 }}
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="loading" class="mt-4 text-gray-600">Loading...</div>
    <div v-if="error" class="mt-4 text-red-600">Error loading match data: {{ error }}</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { aggregateMatchScores } from '@/lib/2025/data-processing';
import { defaultEventId } from '@/lib/constants';
import { RouterLink } from 'vue-router';

export default defineComponent({
  name: 'MatchAnalysisPage',
  components: { RouterLink },
  setup() {
    const matches = ref<any[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);

    onMounted(async () => {
      loading.value = true;
      try {
        const eventData = await aggregateMatchScores(defaultEventId);
        matches.value = eventData.matches || [];
      } catch (err: any) {
        console.error(err);
        error.value = err.message || 'Unknown error';
      } finally {
        loading.value = false;
      }
    });

    return { matches, loading, error };
  }
});
</script>

<style scoped>
table th,
table td {
  text-align: center;
}

.team-link {
  text-decoration: none;
  transition: color 0.2s ease, text-decoration 0.2s ease;
}

.team-link:hover {
  text-decoration: underline;
  font-weight: 600;
}
</style>
