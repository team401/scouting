import { useDataVizContext } from "../ContextProvider";
import { useEffect, useState } from "react";
import { AverageData } from "../types";
import { getAverageData } from "../utils/average";
import { BarChart } from "@mui/x-charts/BarChart";
import * as React from "react";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { mangoFusionPalette } from "@mui/x-charts";

export default function allAveragesGraph() {
  const { dataViz, setDataViz } = useDataVizContext();
  const [averageData, setAverageData] = useState<AverageData[] | null>(null);
  const [width, setWidth] = useState(window.innerWidth);
  const [padding, setPadding] = useState(600);
  const [margin, setMargin] = useState(200);

  useEffect(() => {
    const updateAverage = async () => {
      const average = await getAverageData(dataViz.Competition);
      if (!average) {
        console.error("error fetching averages");
        setAverageData(null);
        return;
      }
      setAverageData(average);
    };

    updateAverage();
  }, [dataViz.Competition, dataViz.Team, dataViz.AllComps]);

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
      {averageData ? (
        dataViz.Elements === "All" ? (
          <BarChart
          colors={mangoFusionPalette}
            width={padding}
            height={300}
            dataset={averageData}
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
                dataKey: "teleSpeaker",
                label: "Teleop Speaker Average",
              },
              {
                dataKey: "teleAmp",
                label: "Teleop Amp Average",
              },
              {
                dataKey: "autoSpeaker",
                label: "Auto Speaker Average",
              },
              {
                dataKey: "autoAmp",
                label: "Auto Amp ",
              },
            ]}
            xAxis={[{ dataKey: "teamNumber", scaleType: "band" }]}
          />
        ) : (
          <div />
        )
      ) : (
        <div>Loading...</div>
      )}

      <script>window.addEventListener('resize', handleResize); const</script>
    </div>
  );
}
