<template>
  <div class="main-content">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=play_circle" />
    <h1 class="text-xl font-bold mb-1">Match Analysis</h1>
    <p class="text-gray-600 mb-4">Click match number to open detailed view</p>

    <table class="table-auto border-collapse border border-gray-400 w-full text-center shadow-sm rounded-lg">
      <thead>
        <tr class="bg-gray-200">
          <th class="border border-gray-400 px-2 py-1">Match</th>
          <th v-for="n in 3" :key="'blue'+n" class="border border-gray-400 px-2 py-1">Blue {{ n }}</th>
          <th v-for="n in 3" :key="'red'+n" class="border border-gray-400 px-2 py-1">Red {{ n }}</th>
          <th class="border border-gray-400 px-2 py-1">Blue Score</th>
          <th class="border border-gray-400 px-2 py-1">Red Score</th>
          <th class="border border-gray-400 px-2 py-1">Watch</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="match in matches" :key="match.matchNumber">
          <!-- Match number links to detailed view -->
          <td class="border border-gray-400 px-2 py-1 font-semibold">
            <RouterLink
              :to="{ path: `/matchDetailed/${match.matchNumber}`, query: { event: defaultEventId } }"
              class="match-link inline-block bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 transition-colors"
            >
              {{ match.matchNumber }}
            </RouterLink>
          </td>

          <!-- Blue alliance -->
          <td
            v-for="team in (match.Blue?.teams || [])"
            :key="'blue-'+team"
            class="border border-gray-400 px-2 py-1"
          >
            <RouterLink
              :to="`/team/${team}`"
              class="team-link font-medium hover:underline"
            >
              {{ team }}
            </RouterLink>
          </td>

          <!-- Fill empty blue columns -->
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
              class="team-link font-medium hover:underline"
            >
              {{ team }}
            </RouterLink>
          </td>

          <!-- Fill empty red columns -->
          <td
            v-for="_ in Math.max(0, 3 - (match.Red?.teams?.length || 0))"
            :key="'red-empty-' + _"
            class="border border-gray-400 px-2 py-1"
          ></td>

          <!-- Blue Score -->
          <td
            class="border border-gray-400 px-2 py-1 font-semibold"
            :class="{
              'bg-blue-500 text-white': match.Blue.score > match.Red.score,
              'bg-purple-300 text-purple-900': match.Blue.score === match.Red.score,
              'bg-blue-200 text-blue-900': match.Blue.score < match.Red.score
            }"
          >
            {{ match.Blue?.score ?? 0 }}
          </td>

          <!-- Red Score -->
          <td
            class="border border-gray-400 px-2 py-1 font-semibold"
            :class="{
              'bg-red-500 text-white': match.Red.score > match.Blue.score,
              'bg-purple-300 text-purple-900': match.Blue.score === match.Red.score,
              'bg-red-200 text-red-900': match.Red.score < match.Blue.score
            }"
          >
            {{ match.Red?.score ?? 0 }}
          </td>

          <!-- Watch Link -->
          <td class="border border-gray-400 px-2 py-1">
            <a
              :href="`https://www.thebluealliance.com/match/${defaultEventId}_qm${match.matchNumber}`"
              target="_blank"
              rel="noopener noreferrer"
              class="watch-link text-gray-600 hover:text-green-600 transition-transform"
              title="Watch on The Blue Alliance"
            >
              <span class="material-symbols-outlined">play_circle</span>
            </a>
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

    return { matches, loading, error, defaultEventId };
  }
});
</script>

<style scoped>
table th,
table td {
  text-align: center;
}

/* Prevent visited links from turning purple */
a:visited,
.team-link:visited,
.match-link:visited {
  color: inherit;
}

/* General link behavior */
.team-link,
.match-link {
  text-decoration: none;
  transition: color 0.2s ease, text-decoration 0.2s ease, background-color 0.2s ease;
}

/* Hover effect */
.team-link:hover {
  text-decoration: underline;
  font-weight: 600;
}

/* Winner/loser/tie backgrounds */
:global(.bg-blue-500) {
  background-color: #0e60ca !important;
  color: white !important;
}

:global(.bg-red-500) {
  background-color: #ff5151 !important;
  color: white !important;
}

:global(.bg-purple-300) {
  background-color: #a76cff !important;
  color: #3b0066 !important;
}

:global(.bg-blue-200) {
  background-color: #9ec3ff !important;
  color: #002a6b !important;
}

:global(.bg-red-200) {
  background-color: #ffc2c2 !important;
  color: #6b0000 !important;
}

/* Team number color */
.team-link {
  color: #c78000 !important;
}

/* Watch icon styling */
.watch-link .nf {
  font-size: 1.6rem;
  vertical-align: middle;
  transition: transform 0.2s ease, color 0.2s ease;
}

.watch-link:hover .nf {
  color: #00a86b;
  transform: scale(1.15);
}
</style>
