import React from "react";
import AllAveragesGraph from "./DataViz/AllAveragesGraph";
import CompetitionSelector from "./Components/CompetitionSelector";
import { useDataVizContext, useSettingsContext } from "./ContextProvider";
import TeamTable from "./DataViz/TeamTable";
import CustomCheckbox from "./Components/CustomCheckbox";
import FullTeamGraph from "./DataViz/FullTeamGraph";
export default function DataGraphs() {
  const { dataViz, setDataViz } = useDataVizContext();
  const { settings, setSettings } = useSettingsContext();
  return (
    <div
      className={`transition min-h-screen w-screen font-sans flex flex-col items-center
      `}
    >
      <div className="w-11/12 h-full md:h-min md:w-fit">
        <div className="min-h-screen items-center">
          <div className="grid grid-auto-rows-auto gap-y-3 mb-5 items-center content-center">
            <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-3/4 overflow-scroll h-full flex flex-col items-center content-center">
              <CompetitionSelector
                value={dataViz.Competition}
                onChange={(event, newValue: string | null) =>
                  setDataViz({
                    ...dataViz,
                    Competition: newValue!,
                  })
                }
              />
              <CustomCheckbox
                label="Playoffs"
                color={settings.Alliance === "Red" ? "#DC2626" : "#2563EB"}
                value={dataViz.Playoffs}
                onChange={(event) =>
                  setDataViz({
                    ...dataViz,
                    Playoffs: event.target.checked,
                  })
                }
              />

              <FullTeamGraph />
            </div>

            <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-fit overflow-scroll h-full flex flex-col items-center content-center py-6">
              <TeamTable />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
