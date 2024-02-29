import React, { useEffect, useState } from "react";
import FullTeamGraph from "../DataViz/FullTeamGraph";
import CompetitionSelector from "../Components/CompetitionSelector";
import { useDataVizContext, useSettingsContext } from "../ContextProvider";
import TeamSelector from "../Components/TeamSelector";
import { GetTeamsDistrict } from "../Data";
import CustomCheckbox from "../Components/CustomCheckbox";
import TeamGraph from "./TeamGraph";
import { Grid, Typography } from "@mui/material";
import supabase from "../Supabase/supabaseClient";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { pink } from "@mui/material/colors";

export default function DataGraphs() {
  const { dataViz, setDataViz } = useDataVizContext();
  const { settings, setSettings } = useSettingsContext();
  const [capabilities, setCapabilities] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);
  useEffect(() => {
    getTeamsListDristrict();
    getCapabilities(dataViz.Competition, dataViz.Team);
  }, [dataViz.Competition]);
  const getTeamsListDristrict = async () => {
    const teams = await GetTeamsDistrict();
    setDataViz({ ...dataViz, TeamsList: teams });
    console.log("DistrictTeams", dataViz.TeamsList);
    console.log(teams);
    return teams;
  };
  const getNickName = async (meat: string) => {
    const response = await fetch(
      "https://www.thebluealliance.com/api/v3/district/2024chs/teams/simple",
      {
        method: "GET",
        headers: {
          "X-TBA-Auth-Key":
            "3MbBFKbSOrahWa5SA7GmFv6L9ByIly1nk0vUPPSK1xQnI4ccLvsF5FRknNFz1CAm",
        },
      }
    );
    if (!response.ok) {
      const message = `An error has occured: ${response.status}`;
      throw new Error(message);
    }
    const resp = await response.json();
    console.log(resp);
    const data = resp.filter(
      (arr: { team_number: string }) => arr.team_number == meat
    );
    console.log(data);
    if (!data[0] || data[0] == undefined || data[0] == null) {
      return "Error";
    }
    const NickName = data[0].nickname;
    console.log("NickName", NickName);
    return NickName;
  };
  const getCapabilities = async (competition: string, team: string) => {
    const { data, error } = await supabase
      .from("Pit_Data")
      .select("Team, Amp, Speaker, Climb, Trap")
      .eq("Competition", competition)
      .eq("Team", team);
    const resp = await data;
    if (error) {
      console.log("you bad", error);
      return;
    }
    if (resp!.length != 1) {
      console.error(
        `Capabilities lookup expected to find 1 team, found ${
          resp!.length
        }. Response:`,
        resp
      );
      return;
    }
    const teamRow = resp![0];
    const caps = [teamRow.Amp, teamRow.Speaker, teamRow.Climb, teamRow.Trap];
    if (caps.length < 4 || caps == null || caps == undefined) {
      console.error("invalid capabilities data");
      return;
    }
    console.log("the deets:", caps);
    setCapabilities(caps);
  };
  return (
    <div
      className={`transition min-h-screen w-screen font-sans flex flex-col items-center
       `}
    >
      <div className="w-11/12 h-full md:h-min md:w-min">
        <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-full overflow-scroll h-full flex flex-col items-center mb-4 py-4">
          <Typography variant="h5">Name: {dataViz.NickName}</Typography>

          <Grid
            container
            spacing={2}
            direction={"column"}
            flexGrow={12}
            marginTop={2}
            overflow={"scroll"}
          >
            <Grid item alignContent={"flex-start"} justifyItems={"start"}>
              <TeamSelector
                options={dataViz.TeamsList}
                value={dataViz.Team}
                onChange={async (event) => {
                  setDataViz({
                    ...dataViz,
                    Team: event.currentTarget.textContent!.toString(),
                    NickName: await getNickName(
                      event.currentTarget.textContent!
                    ),
                  });
                }}
              />
            </Grid>
            <Grid item alignContent={"flex-center"}>
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
                label="All Comps"
                color={settings.Alliance === "Red" ? "#DC2626" : "#2563EB"}
                value={dataViz.AllComps}
                onChange={(event) =>
                  setDataViz({
                    ...dataViz,
                    AllComps: event.target.checked,
                  })
                }
              />
            </Grid>
          </Grid>
          <Grid item>
            <TeamGraph />
          </Grid>
          <Grid item>
            <Typography variant="h6">Capabilities</Typography>
          </Grid>
          <Grid
            item
            container
            gridRow={4}
            alignContent={"center"}
            justifyItems={"center"}
            justifyContent={"center"}
            spacing={3}
          >
            <Grid item>
              <Typography variant="subtitle1">Amp</Typography>
              {capabilities[0] ? (
                <CheckIcon color="success" />
              ) : (
                <CloseIcon sx={{ color: pink[500] }} />
              )}
            </Grid>
            <Grid item>
              <Typography variant="subtitle1">Speaker</Typography>
              {capabilities[1] ? (
                <CheckIcon color="success" />
              ) : (
                <CloseIcon sx={{ color: pink[500] }} />
              )}
            </Grid>
            <Grid item>
              <Typography variant="subtitle1">Climb</Typography>
              {capabilities[2] ? (
                <CheckIcon color="success" />
              ) : (
                <CloseIcon sx={{ color: pink[500] }} />
              )}
            </Grid>
            <Grid item>
              <Typography variant="subtitle1">Trap</Typography>
              {capabilities[3] ? (
                <CheckIcon color="success" />
              ) : (
                <CloseIcon sx={{ color: pink[500] }} />
              )}
            </Grid>
          </Grid>
        </div>
      </div>
    </div>
  );
}
