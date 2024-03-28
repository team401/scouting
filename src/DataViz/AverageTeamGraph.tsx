import * as React from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import supabase from "../Supabase/supabaseClient";
import { BackHand } from "@mui/icons-material";
import {useAverageContext, useDataVizContext} from "../ContextProvider";
import { useEffect, useState } from "react";
import { getAverageData } from "../utils/average";
import { AverageData } from "../types";

export default function AverageTeamGraph() {
  const { dataViz } = useDataVizContext();
  const { averages } = useAverageContext();
  const [teamsList, setTeamsList] = useState<string[]>(["000", "000"]);
  const [currentTeamAvg, setCurrentTeamAvg] = useState<
    AverageData | null
  >(null);
  const [width, setWidth] = useState(window.innerWidth);
  const [padding, setPadding] = useState(600);
  const [margin, setMargin] = useState(200);
  // calls the fetch teams function everytime settings.Competition is updated


  useEffect(() => {
    if (averages) {
      const currentTeam = averages.find((a) => a.teamNumber.toString() === dataViz.Team);
      setCurrentTeamAvg(currentTeam ? currentTeam : null);
    } else {
      setCurrentTeamAvg(null);
    }
  }, [dataViz.Team]);

  const handleResize = () => {
    setWidth(window.innerWidth);
    if (width >= 768) {
      setPadding(800);
      setMargin(200);
    } else {
      setPadding(400);
      setMargin(150);
    }
    console.log("padding:", padding);
  };

  window.addEventListener("resize", handleResize);
  return (
    <div className="flex flex-col gap-2 m-2">
      {currentTeamAvg ? (
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
                data: [currentTeamAvg.teleSpeaker],
                label: "Teleop Speaker",
              },
              {
                data: [currentTeamAvg.teleAmp],
                label: "Teleop Amp",
              },
              {
                data: [currentTeamAvg.autoSpeaker],
                label: "Auto Speaker",
              },
              {
                data: [currentTeamAvg.autoAmp],
                label: "Auto Amp",
              },
              {
                data: [currentTeamAvg.climb],
                label: "Climb",
              },
            ]}
            xAxis={[
              {
                data: [`Team ${currentTeamAvg.teamNumber} Average Points`],
                scaleType: "band",
              },
            ]}
          />
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
              { data: [currentTeamAvg.taxiPercent], label: "Taxi" },
              { data: [currentTeamAvg.trapPercent], label: "Trap" },
              {
                data: [currentTeamAvg.autoAmpAccuracy],
                label: "Auto Amp Accuracy",
              },
              {
                data: [currentTeamAvg.teleAmpAccuracy],
                label: "Tele Amp Accuracy",
              },
            ]}
            xAxis={[
              {
                data: [`Team ${currentTeamAvg.teamNumber} Percentages`],
                scaleType: "band",
              },
            ]}
          />
        </>
      ) : (
        <div>No Team selected</div>
      )}
      <script>window.addEventListener('resize', handleResize); const</script>
    </div>
  );
}
