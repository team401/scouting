import * as React from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import supabase from "../Supabase/supabaseClient";
import { BackHand } from "@mui/icons-material";
import { useDataVizContext } from "../ContextProvider";
import { useEffect, useState } from "react";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

type eventData = {
  team: Number;
};
// Gets all the data for a specific event from supabase
export async function getEventData(competition: string, playoffs: boolean) {
  const { data, error } = await supabase
    .from("Scout_Data")
    .select(
      "team, Auto_Amp_Missed, Auto_Amp_Made, Auto_Speaker_Missed, Auto_Speaker_Made, Teleop_Amp_Missed, Teleop_Amp_Made, Teleop_Speaker_Missed, Teleop_Speaker_Made, Playoffs, Endgame, Trap"
    )
    .eq("Event", competition);
  let resp;
  if (playoffs) {
    resp = await data?.filter((arr: { Playoffs: boolean }) => arr.Playoffs);
  } else {
    resp = await data;
  }
  if (error) {
    console.log("you bad", error);
    return;
  }
  return resp;
}
export async function fetchClimbAvg(team: string, playoffs: boolean) {
  const { data, error } = await supabase
    .from("Scout_Data")
    .select("team, Endgame, Playoffs")
    .eq("team", team);
  let resp;
  if (playoffs) {
    resp = await data?.filter((arr: { Playoffs: boolean }) => arr.Playoffs);
  } else {
    resp = await data;
  }
  if (error) {
    console.log("you bad", error);
    return;
  }
  if (!resp || resp == null || resp == undefined) {
    return 0;
  }
  const values: string[] = await resp!.map(
    (a: { Endgame: string }) => a.Endgame
  );
  if (values.length == 0 || values == null || values == undefined) {
    return 0;
  }
  let sum = 0;
  for (const value of values) {
    if (value == "Parked") {
      sum += 1;
    } else if (value == "Climbed") {
      sum += 3;
    } else if (value == "Harmony ") {
      sum += 5;
    }
  }
  let avg = sum / values.length;
  return avg;
}
export async function fetchTaxiAvg(team: string, playoffs: boolean) {
  const { data, error } = await supabase
    .from("Scout_Data")
    .select("team, Taxi, Playoffs")
    .eq("team", team);
  let resp;
  if (playoffs) {
    resp = await data?.filter((arr: { Playoffs: boolean }) => arr.Playoffs);
  } else {
    resp = await data;
  }
  if (error) {
    console.log("you bad", error);
    return 0;
  }
  if (!resp || resp == null || resp == undefined) {
    return 0;
  }
  const values: boolean[] = await resp!.map((a: { Taxi: boolean }) => a.Taxi);
  if (values.length == 0 || values == null || values == undefined) {
    return 0;
  }
  let sum = 0;
  for (const value of values) {
    if (value) {
      sum++;
    }
  }
  let avg = sum / values.length;
  console.log("Taxi Avg:", avg);
  return avg;
}
export async function fetchTrapAvg(team: string, playoffs: boolean) {
  const { data, error } = await supabase
    .from("Scout_Data")
    .select("team, Trap, Playoffs")
    .eq("team", team);
  let resp;
  if (playoffs) {
    resp = await data?.filter((arr: { Playoffs: boolean }) => arr.Playoffs);
  } else {
    resp = await data;
  }
  if (error) {
    console.log("you bad", error);
    return 0;
  }
  if (!resp || resp == null || resp == undefined) {
    return 0;
  }
  const values: string[] = await resp!.map((a: { Trap: string }) => a.Trap);
  if (values.length == 0 || values == null || values == undefined) {
    return 0;
  }
  let sum = 0;
  for (const value of values) {
    if (value == "Succesful") {
      sum += 1;
    }
  }
  let avg = sum / values.length;
  return avg;
}
export default function FullTeamGraph() {
  const { dataViz, setDataViz } = useDataVizContext();

  const [teamsList, setTeamsList] = useState<string[]>(["000", "000"]);
  const [autoAmpAverage, setAutoAmpAverage] = useState<number[]>([0, 0]);
  const [autoAmpMissed, setAutoAmpMissed] = useState<number[]>([0, 0]);
  const [autoSpeakerMade, setAutoSpeakerMade] = useState<number[]>([0, 0]);
  const [autoSpeakerMissed, setAutoSpeakerMissed] = useState<number[]>([0, 0]);
  const [teleAmpAverage, setTeleAmpAverage] = useState<number[]>([0, 0]);
  const [teleAmpMissed, setTeleAmpMissed] = useState<number[]>([0, 0]);
  const [teleSpeakerMade, setTeleSpeakerMade] = useState<number[]>([0, 0]);
  const [teleSpeakerMissed, setTeleSpeakerMissed] = useState<number[]>([0, 0]);
  const [width, setWidth] = useState(window.innerWidth);
  const [padding, setPadding] = useState(800);
  const [margin, setMargin] = useState(200);
  const handleResize = () => {
    setWidth(window.innerWidth);
    if (width >= 768) {
      setPadding(800);
      setMargin(200);
    } else {
      setPadding(400);
      setMargin(150);
    }
  };

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
  }, [dataViz.Competition, dataViz.Playoffs]);

  const removeDups = (arr: string[]): string[] => {
    let unique: string[] = arr.reduce(function (acc: string[], curr: string) {
      if (!acc.includes(curr)) acc.push(curr);
      return acc;
    }, []);
    return unique;
  };
  // sets the teamList to the xLabels array from getEventData
  const fetchTeams = async (): Promise<string[]> => {
    const resp = await getEventData(dataViz.Competition, dataViz.Playoffs);
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
      if (pos < avgs.length) teamsOrdered.splice(pos, 0, team);
      else {
        teamsOrdered.push(team);
      }
    }
    setTeamsList(teamsOrdered);
    return teamsOrdered;
  };

  const fetchAverage = async (datum: string) => {
    const teams = await fetchTeams();
    const resp = await getEventData(dataViz.Competition, dataViz.Playoffs);
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
  window.addEventListener("resize", handleResize);
  return (
    <div>
      <div className=" col-span-1 px-2">
        <FormControl>
          <InputLabel id="demo-simple-select-autowidth-label" size="normal">
            Elements
          </InputLabel>
          <Select
            labelId="demo-simple-select-autowidth-label"
            id="demo-simple-select-autowidth"
            value={dataViz.Elements}
            label="Elements"
            onChange={(event, newValue) =>
              setDataViz({
                ...dataViz,
                Elements: event.target.value,
              })
            }
          >
            <MenuItem value={"All"}>All</MenuItem>
            <MenuItem value={"Speaker"}>Speaker</MenuItem>
            <MenuItem value={"Amp"}>Amp</MenuItem>
          </Select>
        </FormControl>
      </div>
      {dataViz.Elements === "All" ? (
        <>
          <BarChart
            width={padding}
            height={300}
            margin={{ left: margin }}
            slotProps={{
              legend: {
                direction: "row",
                position: { vertical: "top", horizontal: "left" },
                padding: -15,

                labelStyle: { fontSize: 12, textOverflow: "clip" },
              },
            }}
            series={[
              {
                data: teleAmpAverage,
                label: "Teleop Amp Made",
                stack: "A",
              },
              {
                data: teleAmpMissed,
                label: "Teleop Amp Missed",
                stack: "A",
              },
              {
                data: teleSpeakerMade,
                label: "Teleop Speaker Made",
                stack: "B",
              },
              {
                data: teleSpeakerMissed,
                label: "Teleop Speaker Missed",
                stack: "B",
              },
              {
                data: autoSpeakerMade,
                label: "Auto Speaker Made",
                stack: "C",
              },
              {
                data: autoSpeakerMissed,
                label: "Auto Speaker Missed",
                stack: "C",
              },
              {
                data: autoAmpAverage,
                label: "Auto Amp Made",
                stack: "D",
              },
              {
                data: autoAmpMissed,
                label: "Auto Amp Missed",
                stack: "D",
              },
            ]}
            xAxis={[{ data: teamsList, scaleType: "band" }]}
          />
          <script>
            window.addEventListener('resize', handleResize); const
          </script>
        </>
      ) : (
        <div />
      )}
      {dataViz.Elements === "Speaker" ? (
        <>
          <BarChart
            width={padding}
            height={300}
            margin={{ left: margin }}
            slotProps={{
              legend: {
                direction: "column",
                position: { vertical: "top", horizontal: "left" },
                padding: 0,

                labelStyle: { fontSize: 12, textOverflow: "clip" },
              },
            }}
            series={[
              {
                data: teleSpeakerMade,
                label: "Teleop Speaker Made",
                stack: "B",
              },
              {
                data: teleSpeakerMissed,
                label: "Teleop Speaker Missed",
                stack: "B",
              },
              {
                data: autoSpeakerMade,
                label: "Auto Speaker Made",
                stack: "C",
              },
              {
                data: autoSpeakerMissed,
                label: "Auto Speaker Missed",
                stack: "C",
              },
            ]}
            xAxis={[{ data: teamsList, scaleType: "band" }]}
          />
          <script>
            window.addEventListener('resize', handleResize); const
          </script>
        </>
      ) : (
        <div />
      )}
      {dataViz.Elements === "Amp" ? (
        <>
          <BarChart
            width={padding}
            height={300}
            margin={{ left: margin }}
            slotProps={{
              legend: {
                direction: "column",
                position: { vertical: "top", horizontal: "left" },
                padding: 0,

                labelStyle: { fontSize: 12, textOverflow: "clip" },
              },
            }}
            series={[
              {
                data: teleAmpAverage,
                label: "Teleop Amp Made",
                stack: "A",
              },
              {
                data: teleAmpMissed,
                label: "Teleop Amp Missed",
                stack: "A",
              },
              {
                data: autoAmpAverage,
                label: "Auto Amp Made",
                stack: "D",
              },
              {
                data: autoAmpMissed,
                label: "Auto Amp Missed",
                stack: "D",
              },
            ]}
            xAxis={[{ data: teamsList, scaleType: "band" }]}
          />
          <script>
            window.addEventListener('resize', handleResize); const
          </script>
        </>
      ) : (
        <div />
      )}
    </div>
  );
}
