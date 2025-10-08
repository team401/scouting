import { createRouter, createWebHistory } from "vue-router";
import MatchScoutView from "@/views/MatchScoutView.vue";
import PitScoutView from "@/views/PitScoutView.vue";
import TeamAnalysisView from "@/views/TeamAnalysisView.vue";
import EventAnalysisView from "@/views/EventAnalysisView.vue";
import MatchPreviewView from "@/views/MatchPreviewView.vue";
import PickListView from "@/views/PickListView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "Home",
      component: MatchScoutView,
    },
    {
      path: "/scout",
      name: "Match Scouting",
      component: MatchScoutView,
    },
    {
      path: "/pit-scout",
      name: "Pit Scouting",
      component: PitScoutView,
    },
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
    {
      path: "/match",
      name: "Match Preview",
      component: MatchPreviewView,
    },
    {
      path: "/picklist",
      name: "Pick List",
      component: PickListView,
    }
  ],
});

export default router;
