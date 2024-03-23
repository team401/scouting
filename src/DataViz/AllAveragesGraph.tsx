import {useDataVizContext} from "../ContextProvider";
import {useEffect, useState} from "react";
import {AverageData} from "../types";
import {getAverageData} from "../utils/average";
import {BarChart} from "@mui/x-charts/BarChart";
import * as React from "react";

export default function allAveragesGraph () {
    const { dataViz } = useDataVizContext();
    const [averageData, setAverageData] = useState<AverageData[] | null>(null);
    const [width, setWidth] = useState(window.innerWidth);
    const [padding, setPadding] = useState(600);
    const [margin, setMargin] = useState(200);

    useEffect(() => {
        const updateAverage = async () => {
            const average = await getAverageData(dataViz.Competition);
            if(!average) {
                console.error('error fetching averages');
                setAverageData(null);
                return;
            }
            setAverageData(average);
        }

        updateAverage();
    }, [dataViz.Competition]);

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
            { averageData ? (
                <BarChart
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
                            dataKey: 'teleSpeaker',
                            label: "Teleop Speaker Average",
                        },
                        {
                            dataKey: 'teleAmp',
                            label: "Teleop Amp Average",
                        },
                        {
                            dataKey: 'autoSpeaker',
                            label: "Auto Speaker Average",
                        },
                        {
                            dataKey: 'autoAmp',
                            label: "Auto Amp ",
                        },
                    ]}
                    xAxis={[{ dataKey: 'teamNumber', scaleType: "band" }]}
                />
            ) : (
                <div>Loading...</div>
            ) }
            <script>window.addEventListener('resize', handleResize); const</script>
        </div>
    );
}
