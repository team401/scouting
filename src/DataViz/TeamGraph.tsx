import * as React from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import supabase from "../Supabase/supabaseClient";
import { BackHand } from "@mui/icons-material";
import { useDataVizContext } from "../ContextProvider";
import { useEffect, useState } from "react";
import { getEventData } from "./FullTeamGraph";

export async function getFullTeamData(team: string) {
  const { data, error } = await supabase
    .from("Scout_Data")
    .select(
      "Auto_Amp_Missed, Auto_Amp_Made, Auto_Speaker_Missed, Auto_Speaker_Made, Teleop_Amp_Missed, Teleop_Amp_Made, Teleop_Speaker_Missed, Teleop_Speaker_Made"
    )
    .eq("team", team);
  const resp = await data;
  if (error) {
    console.log("you bad", error);
    return;
  }
  return resp;
}
export default function TeamGraph() {
  const { dataViz, setDataViz } = useDataVizContext();
  const [avgTeamData, setAvgTeamData] = useState<number[][]>([
    [0],
    [0],
    [0],
    [0],
  ]);
  useEffect(() => {
    if (dataViz.AllComps) fetchAveragesAll();
    else fetchAveragesComp(dataViz.Team);
  }, [dataViz.Competition, dataViz.Team, dataViz.AllComps]);
  const fetchAveragesComp = async (team: string) => {
    const resp = await getEventData(dataViz.Competition);
    if (resp == null || resp == undefined) {
      return [];
    }
    const teams = resp!.filter((arr: { team: any }) => arr.team == team);
    console.log("teams:", teams);
    const matches = teams!.map(
      (a: {
        Auto_Amp_Made: any;
        Auto_Speaker_Made: any;
        Teleop_Amp_Made: any;
        Teleop_Speaker_Made: any;
      }) => ({
        Auto_Amp_Made: a.Auto_Amp_Made,
        Auto_Speaker_Made: a.Auto_Speaker_Made,
        Teleop_Amp_Made: a.Teleop_Amp_Made,
        Teleop_Speaker_Made: a.Teleop_Speaker_Made,
      })
    );
    console.log("matches:", matches);
    let teamData: number[][] = [];
    for (let i = 0; i < matches.length; i++) {
      let row: number[] = new Array();
      row.push(matches[i].Auto_Amp_Made);
      row.push(matches[i].Auto_Speaker_Made);
      row.push(matches[i].Teleop_Amp_Made);
      row.push(matches[i].Teleop_Speaker_Made);
      teamData.push(row);
    }
    console.log("teamData", teamData);

    if (!teamData[0] || teamData[0] == null || teamData[0] == undefined) {
      console.log("no team data");
      setAvgTeamData([[0], [0], [0], [0]]);
      return [[0], [0], [0], [0]];
    }
    let avgTeamData: number[][] = [[], [], [], []];
    for (let i = 0; i < teamData[0].length; i++) {
      let sum = 0;
      for (const element of teamData) {
        sum += element[i];
      }
      let average = sum / teamData.length;
      avgTeamData[i].push(average);
    }
    if (
      !avgTeamData[0] ||
      avgTeamData[0] == null ||
      avgTeamData[0] == undefined
    ) {
      console.log("no team data");
      return [[0], [0], [0], [0]];
    }
    console.log("avgTeamData", avgTeamData);
    setAvgTeamData(avgTeamData);
    return avgTeamData;
  };

  const fetchAveragesAll = async () => {
    const resp = await getFullTeamData(dataViz.Team);
    if (resp == null || resp == undefined) {
      return [];
    }
    console.log("resp:", resp);
    const matches = resp!.map(
      (a: {
        Auto_Amp_Made: any;
        Auto_Speaker_Made: any;
        Teleop_Amp_Made: any;
        Teleop_Speaker_Made: any;
      }) => ({
        Auto_Amp_Made: a.Auto_Amp_Made,
        Auto_Speaker_Made: a.Auto_Speaker_Made,
        Teleop_Amp_Made: a.Teleop_Amp_Made,
        Teleop_Speaker_Made: a.Teleop_Speaker_Made,
      })
    );
    console.log("matches:", matches);
    let teamData: number[][] = [];
    for (let i = 0; i < matches.length; i++) {
      let row: number[] = new Array();
      row.push(matches[i].Auto_Amp_Made);
      row.push(matches[i].Auto_Speaker_Made);
      row.push(matches[i].Teleop_Amp_Made);
      row.push(matches[i].Teleop_Speaker_Made);
      teamData.push(row);
    }
    console.log("teamData", teamData);

    if (!teamData[0] || teamData[0] == null || teamData[0] == undefined) {
      console.log("no team data");
      setAvgTeamData([[0], [0], [0], [0]]);
      return [[0], [0], [0], [0]];
    }
    let avgTeamData: number[][] = [[], [], [], []];
    for (let i = 0; i < teamData[0].length; i++) {
      let sum = 0;
      for (const element of teamData) {
        sum += element[i];
      }
      let average = sum / teamData.length;
      avgTeamData[i].push(average);
    }
    if (
      !avgTeamData[0] ||
      avgTeamData[0] == null ||
      avgTeamData[0] == undefined
    ) {
      console.log("no team data");
      return [[0], [0], [0], [0]];
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
