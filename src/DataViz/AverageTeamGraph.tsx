import * as React from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import supabase from "../Supabase/supabaseClient";
import { BackHand } from "@mui/icons-material";
import { useDataVizContext } from "../ContextProvider";
import { useEffect, useState } from "react";
import { getAverageData } from "../utils/average";
import {AverageData} from "../types";


export default function AverageTeamGraph() {
  const { dataViz } = useDataVizContext();
  const [averageData, setAverageData] = useState<AverageData[] | null>(null);
  const [teamsList, setTeamsList] = useState<string[]>(["000", "000"]);
  const [currentTeamAvg, setCurrentTeamAvg] = useState<AverageData | null | undefined>(null);
  const [averages, setAverages] = useState()
  const [width, setWidth] = useState(window.innerWidth);
  const [padding, setPadding] = useState(600);
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
    console.log("padding:", padding);
  };

  // calls the fetch teams function everytime settings.Competition is updated
  useEffect(() => {
    getAverageData(dataViz.Competition).then((data) => {
      if(data) {
        setAverageData(data);
        setTeamsList(data.map((d) => d.teamNumber.toString()));
        setCurrentTeamAvg(data[0]);
      } else {
        console.error('error fetching averages');
        setAverageData(null)
      }
    })
  }, [dataViz.Competition]);

  useEffect(() => {
    if(averageData) {
      setCurrentTeamAvg(averageData.find((d) => d.teamNumber === parseInt(dataViz.Team)));
    } else {
      setCurrentTeamAvg(null);
    }
  }, [dataViz.Team])

  window.addEventListener("resize", handleResize);
  return (
    <div>
      { currentTeamAvg ? (
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
                  label: "Teleop Speaker Average",
                },
                {
                  data: [currentTeamAvg.teleAmp],
                  label: "Teleop Amp Average",
                },
                {
                  data: [currentTeamAvg.autoSpeaker],
                  label: "Auto Speaker Average",
                },
                {
                  data: [currentTeamAvg.autoAmp],
                  label: "Auto Amp ",
                },
              ]}
              xAxis={[{ data: [`Team ${currentTeamAvg.teamNumber} Average Points`], scaleType: "band" }]}
          />
      ) : (
          <div>No Team selected</div>
      ) }
      <script>window.addEventListener('resize', handleResize); const</script>
    </div>
  );
}
