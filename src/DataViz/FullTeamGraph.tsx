import * as React from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import supabase from "../Supabase/supabaseClient";
import { BackHand } from "@mui/icons-material";
import { useDataVizContext } from "../ContextProvider";
import { useEffect, useState } from "react";

type eventData = {
  team: Number;
};
// Gets all the data for a specific event from supabase
export async function getEventData(competition: string) {
  const { data, error } = await supabase
    .from("Scout_Data")
    .select(
      "team, Auto_Amp_Missed, Auto_Amp_Made, Auto_Speaker_Missed, Auto_Speaker_Made, Teleop_Amp_Missed, Teleop_Amp_Made, Teleop_Speaker_Missed, Teleop_Speaker_Made"
    )
    .eq("Event", competition);
  const resp = await data;
  if (error) {
    console.log("you bad", error);
    return;
  }
  return resp;
}
export default function FullTeamGraph() {
  const { dataViz } = useDataVizContext();

  const [teamsList, setTeamsList] = useState<string[]>(["000", "000"]);
  const [autoAmpAverage, setAutoAmpAverage] = useState<number[]>([0, 0]);
  const [autoAmpMissed, setAutoAmpMissed] = useState<number[]>([0, 0]);
  const [autoSpeakerMade, setAutoSpeakerMade] = useState<number[]>([0, 0]);
  const [autoSpeakerMissed, setAutoSpeakerMissed] = useState<number[]>([0, 0]);
  const [teleAmpAverage, setTeleAmpAverage] = useState<number[]>([0, 0]);
  const [teleAmpMissed, setTeleAmpMissed] = useState<number[]>([0, 0]);
  const [teleSpeakerMade, setTeleSpeakerMade] = useState<number[]>([0, 0]);
  const [teleSpeakerMissed, setTeleSpeakerMissed] = useState<number[]>([0, 0]);

  // calls the fetch teams function everytime settings.Competition is updated
  useEffect(() => {
    fetchTeams();
    fetchAverage("Auto_Amp_Made");
    fetchAverage("Auto_Amp_Missed");
    fetchAverage("Auto_Speaker_Made");
    fetchAverage("Auto_Speaker_Missed");
    fetchAverage("Teleop_Amp_Made");
    fetchAverage("Teleop_Amp_Missed");
    fetchAverage("Teleop_Speaker_Made");
    fetchAverage("Teleop_Speaker_Missed");
  }, [dataViz.Competition]);
  const removeDups = (arr: string[]): string[] => {
    let unique: string[] = arr.reduce(function (acc: string[], curr: string) {
      if (!acc.includes(curr)) acc.push(curr);
      return acc;
    }, []);
    return unique;
  };
  // sets the teamList to the xLabels array from getEventData
  const fetchTeams = async (): Promise<string[]> => {
    const resp = await getEventData(dataViz.Competition);
    if (resp == null || resp == undefined) {
      return [];
    }
    const teams = removeDups(resp!.map((a: { team: string }) => a.team));
    console.log("fetchTeams succesfully mapped for Graph:", teams);
    let teamsOrdered:
      | string[]
      | ((prevState: string[]) => string[])
      | PromiseLike<string[]> = [];
    var avgs: number[] = new Array();
    if (
      (!teamsList.length && !teams?.length) ||
      teams.length == 0 ||
      teams == null ||
      teams == undefined
    ) {
      console.log("no Team list");
      setTeamsList([""]);
      return [];
    }
    for (const team of teams) {
      let sum = 0;
      const autoAmp = resp!
        .filter((arr: { team: string }) => arr.team == team)
        .map((a: { Auto_Amp_Made: number }) => a.Auto_Amp_Made);
      const autoSpeaker = resp!
        .filter((arr: { team: string }) => arr.team == team)
        .map((a: { Auto_Speaker_Made: number }) => a.Auto_Speaker_Made);
      const teleAmp = resp!
        .filter((arr: { team: string }) => arr.team == team)
        .map((a: { Teleop_Amp_Made: number }) => a.Teleop_Amp_Made);
      const teleSpeaker = resp!
        .filter((arr: { team: string }) => arr.team == team)
        .map((a: { Teleop_Speaker_Made: number }) => a.Teleop_Speaker_Made);
      for (let i = 0; i < autoAmp.length; i++) {
        sum += autoAmp[i] + autoSpeaker[i] + teleAmp[i] + teleSpeaker[i];
      }
      const average = sum / autoAmp.length;
      let pos = 0;
      if (avgs.length == null || avgs.length == undefined || avgs.length == 0) {
        avgs.push(average);
      } else {
        for (let i = 0; i < avgs.length; i++) {
          if (average >= avgs[i]) {
            avgs.splice(i, 0, average);
            pos = i;
            break;
          } else if (i + 1 == avgs.length) {
            avgs.push(average);
          }
        }
      }
      console.log("avgs", avgs);
      if (pos < avgs.length) teamsOrdered.splice(pos, 0, team);
      else {
        teamsOrdered.push(team);
      }
    }
    console.log("avgs:", avgs);
    console.log("teamsOrdered:", teamsOrdered);
    setTeamsList(teamsOrdered);
    return teamsOrdered;
  };

  const fetchAverage = async (datum: string) => {
    const teams = await fetchTeams();
    const resp = await getEventData(dataViz.Competition);
    if (resp == null || resp == undefined) {
      return;
    }
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
      var autoAmp: number[];
      if (datum == "Auto_Amp_Made") {
        autoAmp = resp!
          .filter((arr: { team: string }) => arr.team == team)
          .map((a: { Auto_Amp_Made: number }) => a.Auto_Amp_Made);
      } else if (datum == "Auto_Amp_Missed") {
        autoAmp = resp!
          .filter((arr: { team: string }) => arr.team == team)
          .map((a: { Auto_Amp_Missed: number }) => a.Auto_Amp_Missed);
      } else if (datum == "Auto_Speaker_Made") {
        autoAmp = resp!
          .filter((arr: { team: string }) => arr.team == team)
          .map((a: { Auto_Speaker_Made: number }) => a.Auto_Speaker_Made);
      } else if (datum == "Auto_Speaker_Missed") {
        autoAmp = resp!
          .filter((arr: { team: string }) => arr.team == team)
          .map((a: { Auto_Speaker_Missed: number }) => a.Auto_Speaker_Missed);
      } else if (datum == "Teleop_Amp_Made") {
        autoAmp = resp!
          .filter((arr: { team: string }) => arr.team == team)
          .map((a: { Teleop_Amp_Made: number }) => a.Teleop_Amp_Made);
      } else if (datum == "Teleop_Amp_Missed") {
        autoAmp = resp!
          .filter((arr: { team: string }) => arr.team == team)
          .map((a: { Teleop_Amp_Missed: number }) => a.Teleop_Amp_Missed);
      } else if (datum == "Teleop_Speaker_Made") {
        autoAmp = resp!
          .filter((arr: { team: string }) => arr.team == team)
          .map((a: { Teleop_Speaker_Made: number }) => a.Teleop_Speaker_Made);
      } else {
        autoAmp = resp!
          .filter((arr: { team: string }) => arr.team == team)
          .map(
            (a: { Teleop_Speaker_Missed: number }) => a.Teleop_Speaker_Missed
          );
      }
      for (let i = 0; i < autoAmp.length; i++) {
        sum += autoAmp[i];
      }
      const average = sum / autoAmp.length;
      avgs[i] = average;
      i++;
    }
    if (datum == "Auto_Amp_Made") setAutoAmpAverage(avgs);
    else if (datum == "Auto_Amp_Missed") setAutoAmpMissed(avgs);
    else if (datum == "Auto_Speaker_Made") setAutoSpeakerMade(avgs);
    else if (datum == "Auto_Speaker_Missed") setAutoSpeakerMissed(avgs);
    else if (datum == "Teleop_Amp_Made") setTeleAmpAverage(avgs);
    else if (datum == "Teleop_Amp_Missed") setTeleAmpMissed(avgs);
    else if (datum == "Teleop_Speaker_Made") setTeleSpeakerMade(avgs);
    else {
      setTeleSpeakerMissed(avgs);
    }
  };
  return (
    <div>
      <BarChart
        width={600}
        height={300}
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
          {
            data: teleAmpAverage,
            label: "Teleop_Amp_Made",
            stack: "A",
          },
          {
            data: teleAmpMissed,
            label: "Teleop_Amp_Missed",
            stack: "A",
          },
          {
            data: teleSpeakerMade,
            label: "Teleop_Speaker_Made",
            stack: "B",
          },
          {
            data: teleSpeakerMissed,
            label: "Teleop_Speaker_Missed",
            stack: "B",
          },
          {
            data: autoSpeakerMade,
            label: "Auto_Speaker_Made",
            stack: "C",
          },
          {
            data: autoSpeakerMissed,
            label: "Auto_Speaker_Missed",
            stack: "C",
          },
          {
            data: autoAmpAverage,
            label: "Auto_Amp_Made",
            stack: "D",
          },
          {
            data: autoAmpMissed,
            label: "Auto_Amp_Missed",
            stack: "D",
          },
        ]}
        xAxis={[{ data: teamsList, scaleType: "band" }]}
      />
    </div>
  );
}
