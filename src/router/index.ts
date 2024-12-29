import { createRouter, createWebHistory } from "vue-router";
import MatchScoutView from "@/views/MatchScoutView.vue";
import PitScoutView from "@/views/PitScoutView.vue";
import TeamAnalysisView from "@/views/TeamAnalysisView.vue";
import EventAnalysisView from "@/views/EventAnalysisView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "Event Analysis",
      component: EventAnalysisView,
    },
    // {
    //   path: "/scout",
    //   name: "Match Scouting",
    //   component: MatchScoutView,
    // },
    // {
    //   path: "/pit-scout",
    //   name: "Pit Scouting",
    //   component: PitScoutView,
    // },
    {
      path: "/team",
      name: "Team Analysis",
      component: TeamAnalysisView,
    },
    {
      path: "/event",
      name: "Event Analysis",
      component: EventAnalysisView,
    },
  ],
});

export default router;