import { useEffect, useState } from "react";
import { useDataVizContext } from "../ContextProvider";
import React from "react";
import { getEventData } from "./FullTeamGraph";
import { LineChart } from "@mui/x-charts";

export default function MatchGraph() {
  const { dataViz, setDataViz } = useDataVizContext();
  const [matches, setMatches] = useState<number[]>([0]);
  const [autoSpeaker, setAutoSpeaker] = useState<number[]>([0]);
  const [autoAmp, setAutoAmp] = useState<number[]>([0]);
  const [teleSpeaker, setTeleSpeaker] = useState<number[]>([0]);
  const [teleAmp, setTeleAmp] = useState<number[]>([0]);
  const [endGame, setEndgame] = useState<number[]>([0]);
  const [numMatches, setNumMatches] = useState<number[]>([0]);
  useEffect(() => {
    getMatchScore();
  }, [dataViz.Team, dataViz.Competition]);
  const getMatchScore = async () => {
    const resp = await getEventData(dataViz.Competition, dataViz.Playoffs);
    const data = resp!
      .filter((arr: { team: any }) => arr.team == dataViz.Team)
      .map(
        (a: {
          Auto_Amp_Made: any;
          Auto_Speaker_Made: any;
          Teleop_Amp_Made: any;
          Teleop_Speaker_Made: any;
          Endgame: any;
          Trap: any;
        }) => ({
          Auto_Amp_Made: a.Auto_Amp_Made,
          Auto_Speaker_Made: a.Auto_Speaker_Made,
          Teleop_Amp_Made: a.Teleop_Amp_Made,
          Teleop_Speaker_Made: a.Teleop_Speaker_Made,
          Endgame: a.Endgame,
          Trap: a.Trap,
        })
      );
    let matches: number[] = [];
    let teleSpeaker: number[] = [];
    let teleAmp: number[] = [];
    let autoSpeaker: number[] = [];
    let autoAmp: number[] = [];
    let endgame: number[] = [];
    for (const match of data) {
      let autosp = 0;
      let autoam = 0;
      let telesp = 0;
      let teleam = 0;
      let end = 0;
      autoam += match.Auto_Amp_Made * 2;
      autosp += match.Auto_Speaker_Made * 5;
      teleam += match.Teleop_Amp_Made;
      telesp += match.Teleop_Speaker_Made * 2;
      if (match.Endgame === "Climbed") {
        end += 3;
      }
      if (match.Endgame === "Harmony") {
        end += 5;
      }
      if (match.Endgame === "Parked") {
        end += 1;
      }
      if (match.Endgame === "Succesful") {
        end += 5;
      }
      matches.push(autoam + autosp + teleam + telesp + end);
      teleSpeaker.push(telesp);
      teleAmp.push(teleam);
      autoAmp.push(autoam);
      autoSpeaker.push(autosp);
      endgame.push(end);
    }
    let numMatches: number[] = [];
    for (let i = 1; i <= matches.length; i++) {
      numMatches.push(i);
    }
    setNumMatches(numMatches);
    setAutoSpeaker(autoSpeaker);
    setAutoAmp(autoAmp);
    setTeleAmp(teleAmp);
    setTeleSpeaker(teleSpeaker);
    setEndgame(endgame);
    setMatches(matches);
  };
  return (
    <div>
      {dataViz.Elements === "All" ? (
        <LineChart
          height={400}
          width={500}
          sx={{ maxWidth: 600, width: 300 }}
          series={[{ data: matches }]}
          xAxis={[{ data: numMatches, scaleType: "band" }]}
        />
      ) : (
        <div />
      )}
      {dataViz.Elements === "Speaker" ? (
        <LineChart
          height={400}
          width={500}
          sx={{ maxWidth: 600, width: 300 }}
          series={[
            { data: teleSpeaker, label: "Teleop" },
            { data: autoSpeaker, label: "Auto" },
          ]}
          xAxis={[{ data: numMatches, scaleType: "band" }]}
        />
      ) : (
        <div />
      )}
      {dataViz.Elements === "Amp" ? (
        <LineChart
          height={400}
          width={500}
          sx={{ maxWidth: 600, width: 300 }}
          series={[
            { data: teleAmp, label: "Teleop" },
            { data: autoAmp, label: "Auto" },
          ]}
          xAxis={[{ data: numMatches, scaleType: "band" }]}
        />
      ) : (
        <div />
      )}
      {dataViz.Elements === "Endgame" ? (
        <LineChart
          height={400}
          width={500}
          sx={{ maxWidth: 600, width: 300 }}
          series={[{ data: endGame }]}
          xAxis={[{ data: numMatches, scaleType: "band" }]}
        />
      ) : (
        <div />
      )}
    </div>
  );
}
