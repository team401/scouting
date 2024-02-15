import * as React from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import supabase from "../Supabase/supabaseClient";
import { BackHand } from "@mui/icons-material";
import { useDataVizContext } from "../ContextProvider";
import { useEffect, useState } from "react";
// Gets all the data for a specific event from supabase
export async function getEventData(competition: string) {
  const { data, error } = await supabase
    .from("Scout_Data")
    .select(
      "team, Auto_Amp_Missed, Auto_Amp_Made, Auto_Speaker_Missed, Auto_Speaker_Made, Teleop_Amp_Missed, Teleop_Amp_Made, Teleop_Speaker_Missed, Teleop_Speaker_Made"
    )
    .eq("Event", competition);
  const resp = data;
  if (error) {
    console.log("you bad");
    return;
  }
  return resp;
}
export default function FullTeamGraph() {
  const { dataViz } = useDataVizContext();

  const [teamsList, setTeamsList] = useState<string[]>(["000", "000"]);
  const [autoAmpAverage, setAutoAmpAverage] = useState<number[]>([0, 0]);
  const [autoAmpMissed, setAutoAmpMissed] = useState<number[]>([0, 0]);

  // calls the fetch teams function everytime settings.Competition is updated
  useEffect(() => {
    fetchTeams();
    fetchAutoAmpAvg();
    fetchAutoAmpMissed();
  }, [dataViz.Competition]);

  // sets the teamList to the xLabels array from getEventData
  const fetchTeams = async (): Promise<string[]> => {
    const resp = await getEventData(dataViz.Competition);
    if (resp == null || resp == undefined) {
      return [];
    }
    const teams = resp!.map((a: { team: string }) => a.team);
    console.log("fetchTeams succesfully mapped", teams);
    setTeamsList(teams);
    return teams;
  };
  const fetchAutoAmpAvg = async () => {
    const teams = await fetchTeams();
    const resp = await getEventData(dataViz.Competition);
    if (resp == null || resp == undefined) {
      return;
    }
    console.log("TeamList:", teamsList, teams);
    console.log("succesful fetch", resp);
    let avgs = [];
    if (
      (!teamsList.length && !teams?.length) ||
      teams.length == 0 ||
      teams == null ||
      teams == undefined
    ) {
      console.log("no Team list");
      return;
    }
    let i = 0;
    for (const team of teams) {
      let sum = 0;
      const autoAmp = resp!
        .filter((arr: { team: string }) => arr.team == team)
        .map(
          (a: { Auto_Amp_Missed: number; Auto_Amp_Made: number }) =>
            a.Auto_Amp_Made
        );
      console.log("autoAmp:" + autoAmp);
      for (let i = 0; i < autoAmp.length; i++) {
        sum += autoAmp[i];
      }
      const average = sum / autoAmp.length;
      avgs[i] = average;
      i++;
    }
    console.log("avgs:", avgs);
    setAutoAmpAverage(avgs);
  };
  const fetchAutoAmpMissed = async () => {
    const teams = await fetchTeams();
    const resp = await getEventData(dataViz.Competition);
    if (resp == null || resp == undefined) {
      return;
    }
    console.log("TeamList:", teamsList, teams);
    console.log("succesful fetch", resp);
    let avgs = [];
    if (
      (!teamsList.length && !teams?.length) ||
      teams.length == 0 ||
      teams == null ||
      teams == undefined
    ) {
      console.log("no Team list");
      return;
    }
    let i = 0;
    for (const team of teams) {
      let sum = 0;
      const autoAmp = resp!
        .filter((arr: { team: string }) => arr.team == team)
        .map((a: { Auto_Amp_Missed: number }) => a.Auto_Amp_Missed);
      console.log("autoAmpMissed:" + autoAmp);
      for (let i = 0; i < autoAmp.length; i++) {
        sum += autoAmp[i];
      }
      const average = sum / autoAmp.length;
      avgs[i] = average;
      i++;
    }
    console.log("avgMissed:", avgs);
    setAutoAmpMissed(avgs);
  };

  return (
    <div>
      <BarChart
        width={500}
        height={300}
        series={[
          {
            data: autoAmpMissed,
            label: "Auto_Amp_Missed",
            stack: "A",
            color: "#FF474C",
          },
          {
            data: autoAmpAverage,
            label: "Auto_Amp_Average",
            stack: "A",
            color: "#90EF90",
          },
        ]}
        xAxis={[{ data: teamsList, scaleType: "band" }]}
      />
    </div>
  );
}
