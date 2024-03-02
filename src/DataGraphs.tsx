import React from "react";
import FullTeamGraph from "./DataViz/FullTeamGraph";
import CompetitionSelector from "./Components/CompetitionSelector";
import { useDataVizContext } from "./ContextProvider";
import TeamTable from "./DataViz/TeamTable";
export default function DataGraphs() {
  const { dataViz, setDataViz } = useDataVizContext();
  return (
    <div
      className={`transition min-h-screen w-screen font-sans flex flex-col items-center
      `}
    >
      <div className="w-11/12 h-full md:h-min md:w-3/4">
        <div className="min-h-screen">
          <div className="grid grid-auto-rows-auto gap-y-3 mb-5">
            <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-1/2 overflow-scroll h-full flex flex-col items-center">
              <CompetitionSelector
                value={dataViz.Competition}
                onChange={(event, newValue: string | null) =>
                  setDataViz({
                    ...dataViz,
                    Competition: newValue!,
                  })
                }
              />
              <FullTeamGraph />
            </div>

            <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-1/2 overflow-scroll h-full flex flex-col items-center content-center py-6">

              <TeamTable />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
