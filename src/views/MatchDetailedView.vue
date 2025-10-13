<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "@/lib/supabase-client";
import { aggregateMatchScores } from "@/lib/2025/data-processing";
import { defaultEventId } from "@/lib/constants";

const route = useRoute();
const matchNumber = ref(String(route.params.matchnumber || ""));
const eventId = ref(String(route.query.event || defaultEventId));

const match = ref<any | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const headScoutLoaded = ref(false);
const autoComments = ref<string | null>(null);
const teleComments = ref<string | null>(null);
const postComments = ref<string | null>(null);
const winningAlliance = ref<string | null>(null);

// raw team rows keyed by team number
const teamPerformances = ref<Record<string, any>>({});

onMounted(async () => {
  loading.value = true;
  error.value = null;
  headScoutLoaded.value = false;
  teamPerformances.value = {};

  try {
    if (!matchNumber.value) {
      error.value = `No match number provided in URL params.`;
      loading.value = false;
      return;
    }

    // 1) Get aggregated match list (scoring logic centralized)
    const eventData = await aggregateMatchScores(eventId.value);
    const matchesArr = eventData.matches || [];

    // find the single match by possible keys
    const found = matchesArr.find(
      (m: any) =>
        String(m.matchNumber || m.match_number || m.prematch?.match_number) === matchNumber.value
    );

    if (!found) {
      match.value = null;
      error.value = `No match found for match number: ${matchNumber.value}`;
      loading.value = false;
      return;
    }

    match.value = found;

    // determine winner (support different shapes)
    const blueScore = Number(match.value.Blue?.score ?? match.value.blue_score ?? 0);
    const redScore = Number(match.value.Red?.score ?? match.value.red_score ?? 0);
    winningAlliance.value = blueScore > redScore ? "blue" : redScore > blueScore ? "red" : null;

    // 2) Fetch head-scout comments — columns literally named with dots
    //    Use quoted column names in select and access via bracket keys.
    const { data: commentsData, error: commentsError } = await supabase
      .from("HeadScoutData")
      .select(`"auto.autocomments","teleop.telecomments","postmatch.postcomments","prematch.match_number","event"`)
      .eq('"prematch.match_number"', matchNumber.value)
      .eq("event", eventId.value)
      .maybeSingle();

    if (commentsError) {
      // not fatal, but log
      console.warn("Head scout fetch error:", commentsError);
    } else if (commentsData) {
      // Access the literal dot-named fields
      autoComments.value = (commentsData as any)["auto.autocomments"] ?? null;
      teleComments.value = (commentsData as any)["teleop.telecomments"] ?? null;
      postComments.value = (commentsData as any)["postmatch.postcomments"] ?? null;
    }
    headScoutLoaded.value = true;

    const { data: teamRows, error: teamError } = await supabase
      .from("MatchData")
      .select("*")
      .eq('"prematch.match_number"', matchNumber.value)
      .eq("event", eventId.value);

    if (teamError) {
      console.warn("Error fetching team performance rows:", teamError);
    } else if (teamRows && teamRows.length > 0) {
     
      const grouped: Record<string, any> = {};
      for (const row of teamRows) {
      
        const teamKey = row["prematch.team_number"] ?? row["prematch.team"] ?? row["team_number"] ?? String(row.team);
        if (!teamKey) continue;
        
        grouped[String(teamKey)] = row;
      }
      teamPerformances.value = grouped; //TODO: here!!!! make this have real, not just flush of all data
      // debug:
      // console.debug("teamPerformances", JSON.stringify(grouped, null, 2));
    } else {
      // no team rows found
      teamPerformances.value = {};
    }
  } catch (err: any) {
    console.error("MatchDetailed error:", err);
    error.value = err.message ?? String(err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="main-content">
    <h1 class="mb-4 font-bold text-xl">Match {{ matchNumber }} - {{ eventId }}</h1>

    <!-- Match Summary -->
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
            v-for="alliance in ['Blue','Red']"
            :key="alliance"
            :class="{
              'winner-row': winningAlliance === alliance.toLowerCase(),
              'loser-row': winningAlliance && winningAlliance !== alliance.toLowerCase()
            }"
          >
            <td class="font-semibold">{{ alliance }}</td>
            <td>
              <template v-if="(match[alliance]?.teams?.length || 0) > 0">
                <span v-for="(team, idx) in match[alliance].teams" :key="alliance + '-team-' + team">
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
    <div class="data-tile mt-4" v-if="headScoutLoaded">
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


    <div class="flex flex-wrap gap-4 mt-4" v-if="match">
        <!--blue allliance -->
      <div
        v-for="team in match.Blue?.teams || []"
        :key="'blue-' + team"
        class="team-tile blue-tile"
      >
        <h3 class="team-name">{{ team }}</h3>

        <div v-if="teamPerformances[String(team)]">
          <!-- iterate fields for that team row -->
          <p
            v-for="(val, key) in teamPerformances[String(team)]"
            :key="key"
            class="text-sm text-gray-300"
          >
            <b>{{ formatFieldName(key) }}:</b>
            <span> {{ formatValue(val) }}</span>
          </p>
        </div>
        <div v-else class="text-gray-400 italic">No team row found for this team/match.</div>
      </div>

      <!--red allliance -->
      <div
        v-for="team in match.Red?.teams || []"
        :key="'red-' + team"
        class="team-tile red-tile"
      >
        <h3 class="team-name">{{ team }}</h3>

        <div v-if="teamPerformances[String(team)]">
          <p
            v-for="(val, key) in teamPerformances[String(team)]"
            :key="key"
            class="text-sm text-gray-300"
          >
            <b>{{ formatFieldName(key) }}:</b>
            <span> {{ formatValue(val) }}</span>
          </p>
        </div>
        <div v-else class="text-gray-400 italic">No team row found for this team/match.</div>
      </div>
    </div>

    <div v-if="loading" class="mt-4 text-gray-600">Loading...</div>
    <div v-if="error" class="mt-4 text-red-600">Error: {{ error }}</div>
  </div>
</template>

<script lang="ts">

const formatFieldName = (k: string) => {
  try {
    if (!k) return k;
    
    const parts = String(k).split(".");
    return parts[parts.length - 1];
  } catch {
    return k;
  }
};

const formatValue = (v: any) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
};
</script>

<style scoped>
.main-content {
  padding-top: 1rem;
}
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
.team-tile {
  flex: 1 1 220px;
  background-color: #1f1f1f;
  color: #fff;
  padding: 12px;
  border-radius: 8px;
  border: 2px solid;
  min-width: 200px;
  max-width: 320px;
}
.blue-tile {
  border-color: #3b82f6;
}
.red-tile {
  border-color: #ef4444;
}
.team-name {
  font-weight: bold;
  margin-bottom: 8px;
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
