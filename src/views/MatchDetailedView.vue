<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "@/lib/supabase-client";
import { aggregateMatchScores } from "@/lib/2025/data-processing";
import { defaultEventId } from "@/lib/constants";

const route = useRoute();
const matchNumber = ref(route.params.matchnumber || "");
const eventId = ref(route.query.event || defaultEventId);

const match = ref<any | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const headScoutLoaded = ref(false);
const autoComments = ref<string | null>(null);
const teleComments = ref<string | null>(null);
const postComments = ref<string | null>(null);
const winningAlliance = ref<string | null>(null);

onMounted(async () => {
  loading.value = true;
  error.value = null;
  headScoutLoaded.value = false;

  try {
    // 1) Get matches from aggregate helper
    const eventData = await aggregateMatchScores(eventId.value);
    const matchesArr = eventData.matches || [];

    // find the single match
    const found = matchesArr.find(
      (m: any) =>
        String(m.matchNumber || m.match_number || m.prematch?.match_number) === matchNumber.value
    );

    if (!found) {
      match.value = null;
      error.value = `No match found for match number: ${matchNumber.value}`;
    } else {
      match.value = found;

      // determine winner
      const blueScore = Number(match.value.Blue?.score ?? match.value.blue_score ?? 0);
      const redScore = Number(match.value.Red?.score ?? match.value.red_score ?? 0);
      winningAlliance.value = blueScore > redScore ? "blue" : redScore > blueScore ? "red" : null;
    }

    // 2) Load head scout comments from HeadScoutData
    const { data: commentsData, error: commentsError } = await supabase
  .from("HeadScoutData")
  .select(`"auto.autocomments","teleop.telecomments","postmatch.postcomments"`)
  .eq('"prematch.match_number"', matchNumber.value)
  .eq("event", eventId.value)
  .maybeSingle();

    if (commentsError) {
      console.warn("Head scout fetch error:", commentsError);
    } else if (commentsData) {
      autoComments.value = commentsData["auto.autocomments"] || null;
      teleComments.value = commentsData["teleop.telecomments"] || null;
      postComments.value = commentsData["postmatch.postcomments"] || null;
    }
    headScoutLoaded.value = true;
  } catch (err: any) {
    console.error(err);
    error.value = err.message || String(err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="main-content">
    <!-- Title -->
    <h1 class="mb-4 font-bold text-xl">
      Match {{ matchNumber }} - {{ eventId }}
    </h1>

    <!-- Match Table -->
    <div class="data-tile" v-if="match">
      <h2>Match Summary</h2>
      <table class="table-auto border-collapse border border-gray-400 w-full text-center">
        <thead>
          <tr class="bg-gray-200">
            <th class="border border-gray-400 px-2 py-1">Alliance</th>
            <th class="border border-gray-400 px-2 py-1">Teams</th>
            <th class="border border-gray-400 px-2 py-1">Score</th>
            <th class="border border-gray-400 px-2 py-1">Winner</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="alliance in ['Blue', 'Red']"
            :key="alliance"
            :class="{
              'winner-row': winningAlliance === alliance.toLowerCase(),
              'loser-row': winningAlliance && winningAlliance !== alliance.toLowerCase()
            }"
          >
            <td class="font-semibold">{{ alliance }}</td>
            <td>
              <template v-if="(match[alliance]?.teams?.length || 0) > 0">
                <span
                  v-for="(team, idx) in match[alliance].teams"
                  :key="alliance + '-team-' + team"
                >
                  <a :href="`/team/${team}`" class="team-link">{{ team }}</a>
                  <span v-if="idx < match[alliance].teams.length - 1">, </span>
                </span>
              </template>
              <template v-else>
                <span class="text-gray-400">—</span>
              </template>
            </td>
            <td>{{ match[alliance]?.score ?? 0 }}</td>
            <td>{{ winningAlliance === alliance.toLowerCase() ? 'Winner' : '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Head Scout Comments -->
    <div class="data-tile" v-if="headScoutLoaded">
      <h2>Head Scout Comments</h2>

      <div v-if="!autoComments && !teleComments && !postComments" class="text-gray-400 italic">
        No head-scout comments for this match.
      </div>

      <div v-else>
        <div v-if="autoComments" class="mb-3">
          <h3>Autonomous</h3>
          <p>{{ autoComments }}</p>
        </div>
        <div v-if="teleComments" class="mb-3">
          <h3>Teleop</h3>
          <p>{{ teleComments }}</p>
        </div>
        <div v-if="postComments">
          <h3>Post-Match</h3>
          <p>{{ postComments }}</p>
        </div>
      </div>
    </div>

    <div v-if="loading" class="mt-4 text-gray-600">Loading...</div>
    <div v-if="error" class="mt-4 text-red-600">Error: {{ error }}</div>
  </div>
</template>

<style scoped>
.table-auto th,
.table-auto td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: center;
}

.table-auto th {
  background-color: #222;
  color: white;
}

.winner-row {
  background-color: rgba(0, 123, 255, 0.12);
  font-weight: bold;
}

.loser-row {
  background-color: rgba(255, 0, 0, 0.06);
}

.team-link {
  color: rgb(0, 102, 204);
  text-decoration: none;
  font-weight: 600;
}

.team-link:hover {
  text-decoration: underline;
}

.data-tile {
  margin-top: 20px;
  background-color: #1f1f1f;
  color: #fff;
  padding: 15px;
  border-radius: 8px;
}

h2 {
  margin-bottom: 10px;
}

h3 {
  margin-top: 10px;
  color: #ffc107;
}
</style>
