import React, { useEffect, useState } from "react";
import FullTeamGraph from "../DataViz/FullTeamGraph";
import CompetitionSelector from "../Components/CompetitionSelector";
import { useDataVizContext, useSettingsContext } from "../ContextProvider";
import TeamSelector from "../Components/TeamSelector";
import { GetTeamsDistrict, GetTeamsEvent } from "../Data";
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
  const [drive, setDrive] = useState<string>("Unknown");
  const [capabilities, setCapabilities] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);
  useEffect(() => {
    if (dataViz.AllComps) {
      getTeamsListDistrict();
    } else {
      getTeamsListCompetition(dataViz.Competition);
    }
    getCapabilities(dataViz.Competition, dataViz.Team);
    getDrive(dataViz.Competition, dataViz.Team);
  }, [dataViz.Competition, dataViz.Team]);
  const getTeamsListDistrict = async () => {
    const teams = await GetTeamsDistrict();
    setDataViz({ ...dataViz, TeamsList: teams });
    return teams;
  };
  const getTeamsListCompetition = async (competition: string) => {
    const teams = await GetTeamsEvent(competition);
    setDataViz({ ...dataViz, TeamsList: teams });
    return teams;
  };
  const getNickName = async (meat: string) => {
    let response;
    if (dataViz.AllComps) {
      response = await fetch(
        "https://www.thebluealliance.com/api/v3/district/2024chs/teams/simple",
        {
          method: "GET",
          headers: {
            "X-TBA-Auth-Key":
              "3MbBFKbSOrahWa5SA7GmFv6L9ByIly1nk0vUPPSK1xQnI4ccLvsF5FRknNFz1CAm",
          },
        }
      );
    } else {
      if (meat == "" || meat.length == 0) {
        return setDataViz({ ...dataViz, NickName: "Error" });
      }
      response = await fetch(
        "https://www.thebluealliance.com/api/v3/team/frc" + meat + "/simple",
        {
          method: "GET",
          headers: {
            "X-TBA-Auth-Key":
              "3MbBFKbSOrahWa5SA7GmFv6L9ByIly1nk0vUPPSK1xQnI4ccLvsF5FRknNFz1CAm",
          },
        }
      );
    }
    if (!response.ok) {
      const message = `An error has occured: ${response.status}`;
      throw new Error(message);
    }
    const resp = await response.json();
    if (resp.legnth == 0 || resp == undefined || resp == null) {
      return "Error";
    }
    const NickName = resp.nickname;
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
      setCapabilities([false, false, false, false]);
      return;
    }
    const teamRow = resp![0];
    const caps = [teamRow.Amp, teamRow.Speaker, teamRow.Climb, teamRow.Trap];
    if (caps.length < 4 || caps == null || caps == undefined) {
      console.error("invalid capabilities data");
      return;
    }
    console.log("Capabalities:", caps);
    setCapabilities(caps);
  };
  const getDrive = async (competition: string, team: string) => {
    const { data, error } = await supabase
      .from("Pit_Data")
      .select("Team, Drive")
      .eq("Competition", competition)
      .eq("Team", team);
    const resp = await data;
    if (error) {
      console.log("you bad", error);
      return;
    }
    if (resp!.length != 1) {
      console.error(
        `Drive lookup expected to find 1 team, found ${
          resp!.length
        }. Response:`,
        resp
      );
      return;
    }
    const teamRow = resp![0];
    const drive = teamRow.Drive;
    setDrive(drive);
  };
  return (
    <div
      className={`transition min-h-screen w-screen font-sans flex flex-col items-center
       `}
    >
      <div className="w-11/12 h-full md:h-min md:w-min">
        <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-full overflow-scroll h-full flex flex-col items-center mb-4 py-4">
          <Typography variant="h5" paddingTop={2}>
            {" "}
            <b>Name: {dataViz.NickName} </b>
          </Typography>

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
            paddingBottom={1}
          >
            <Grid item>
              <Typography variant="subtitle1">
                <u>Amp</u>
              </Typography>
              {capabilities[0] ? (
                <CheckIcon color="success" />
              ) : (
                <CloseIcon sx={{ color: pink[500] }} />
              )}
            </Grid>
            <Grid item>
              <Typography variant="subtitle1">
                <u>Speaker</u>
              </Typography>
              {capabilities[1] ? (
                <CheckIcon color="success" />
              ) : (
                <CloseIcon sx={{ color: pink[500] }} />
              )}
            </Grid>
            <Grid item>
              <Typography variant="subtitle1">
                <u>Climb</u>
              </Typography>
              {capabilities[2] ? (
                <CheckIcon color="success" />
              ) : (
                <CloseIcon sx={{ color: pink[500] }} />
              )}
            </Grid>
            <Grid item>
              <Typography variant="subtitle1">
                <u>Trap</u>
              </Typography>
              {capabilities[3] ? (
                <CheckIcon color="success" />
              ) : (
                <CloseIcon sx={{ color: pink[500] }} />
              )}
            </Grid>
            <Grid item>
              <Typography variant="subtitle1">
                <u>Drive</u>
              </Typography>
              <Typography variant="subtitle1">{drive}</Typography>
            </Grid>
          </Grid>
        </div>
      </div>
    </div>
  );
}
