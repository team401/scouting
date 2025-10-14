import { createRouter, createWebHistory } from "vue-router";
import MatchScoutView from "@/views/MatchScoutView.vue";
import PitScoutView from "@/views/PitScoutView.vue";
import TeamAnalysisView from "@/views/TeamAnalysisView.vue";
import EventAnalysisView from "@/views/EventAnalysisView.vue";
import MatchPreviewView from "@/views/MatchPreviewView.vue";
import MatchAnalysisView from "@/views/MatchAnalysisView.vue";
import HeadscoutReviewView from "@/views/HeadScoutReviewView.vue";

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
  path: "/team/:teamNumber",
  name: "Team Analysis Detail",
  component: TeamAnalysisView,
  props: true,
},
    {
      path: "/event",
      name: "Event Analysis",
      component: EventAnalysisView,
    },
      {
      path: "/headscout",
      name: "Headscout Review",
      component: HeadscoutReviewView,
    },
    {
      path: "/matchPreview",
      name: "Match Preview",
      component: MatchPreviewView,
    },
    {
      path: "/match",
      name: "Match Analysis",
      component: MatchAnalysisView,
    },
    {
  path: '/matchDetailed/:matchnumber',
  name: 'MatchDetails',
  component: () => import('@/views/MatchDetailedView.vue')
},

  ],
});

export default router;
