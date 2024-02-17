import * as React from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import supabase from "../Supabase/supabaseClient";
import { BackHand } from "@mui/icons-material";
import { useDataVizContext } from "../ContextProvider";
import { useEffect, useState } from "react";
import { getEventData } from "./FullTeamGraph";

export default function TeamGraph() {
  const { dataViz, setDataViz } = useDataVizContext();
  const [avgTeamData, setAvgTeamData] = useState<number[][]>([
    [0],
    [0],
    [0],
    [0],
  ]);
  useEffect(() => {
    fetchAveragesComp(dataViz.Team);
  }, [dataViz.Competition, dataViz.Team]);
  const fetchAveragesComp = async (team: string) => {
    const resp = await getEventData(dataViz.Competition);
    if (resp == null || resp == undefined) {
      return [];
    }
    const teamData = resp!
      .filter((arr: { team: any }) => arr.team == team)
      .map(
        (a: {
          Auto_Amp_Made: number[];
          Auto_Speaker_Made: number[];
          Teleop_Amp_Made: number[];
          Teleop_Speaker_Made: number[];
        }) => (
          a.Auto_Amp_Made,
          a.Auto_Speaker_Made,
          a.Teleop_Amp_Made,
          a.Teleop_Speaker_Made
        )
      );
    console.log("teamData", teamData);
    if (!teamData[0] || teamData[0] == null || teamData[0] == undefined) {
      console.log("no team data");
      return [[0], [0], [0], [0]];
    }
    var avgTeamData = new Array();
    for (let i = 0; i < teamData.length; i++) {
      let sum = 0;
      for (const element of teamData[i]) {
        sum += element;
      }
      let average = sum / teamData[0].length;
      avgTeamData[i] = average;
    }
    console.log("avgTeamData", avgTeamData);
    setAvgTeamData(avgTeamData);
    return avgTeamData;
  };
  return (
    <BarChart
      height={400}
      width={600}
      margin={{ left: 200 }}
      slotProps={{
        legend: {
          direction: "column",
          position: { vertical: "top", horizontal: "left" },
          padding: -1,
          labelStyle: { fontSize: 12 },
        },
      }}
      series={[
        { data: avgTeamData[0], label: "Auto_Amp" },
        { data: avgTeamData[1], label: "Auto_Speaker" },
        { data: avgTeamData[2], label: "Tele_Amp" },
        { data: avgTeamData[3], label: "Tele_Speaker" },
      ]}
      xAxis={[{ data: [dataViz.Team], scaleType: "band" }]}
    />
  );
}
