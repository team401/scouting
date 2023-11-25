import * as React from "react";
import { Autocomplete, Grid, TextField, Typography } from "@mui/material";

import Page from "./components/Page";
import HeaderCard, { HeaderButton } from "./components/HeaderCard";
import BigCheckBox from "./components/BigCheckBox";

import { PreMatchData, usePreContext } from "./ScoutingContexts";

import { vablaTeams, vafalTeams, dcmpTeams, worldsTeams } from "./EventTeams";

export default function PreMatch() {
  const preVals = usePreContext();

  const teamsList =
    new Date() < new Date("2024-03-04")
      ? vablaTeams
      : new Date() < new Date("2024-04-04")
      ? vafalTeams
      : new Date() < new Date("2024-04-17")
      ? dcmpTeams
      : worldsTeams;

  const pageButtons: HeaderButton[] = [
    { title: "Next page (Auto)", link: "/#/auto" },
  ];

  return (
    <Page>
      <HeaderCard title={"Pre-Match"} buttons={pageButtons}>
        <Grid container rowSpacing={5} columnSpacing={1}>
          <Grid item xs={12}>
            <TextField
              id="scout-name"
              value={preVals.preMatch.scout}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                preVals.setPre({
                  ...preVals.preMatch,
                  scout: event.target.value,
                });
              }}
              label={
                <Typography variant="h6" component="h1">
                  Scout Name
                </Typography>
              }
              variant="standard"
              sx={{ width: "100%" }}
            />
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
              disablePortal
              id="combo-box-demo"
              options={teamsList}
              value={preVals.preMatch.team}
              onChange={(event: any, newValue: number | null) => {
                preVals.setPre({
                  ...preVals.preMatch,
                  team: newValue,
                });
              }}
              renderInput={(params) => (
                <TextField
                  variant="standard"
                  type="number"
                  {...params}
                  label={
                    <Typography variant="h6" component="h1">
                      Team Being Scouted
                    </Typography>
                  }
                />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              id="match-num"
              label={
                <Typography variant="h6" component="h1">
                  Match Number
                </Typography>
              }
              value={preVals.preMatch.match}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                preVals.setPre({
                  ...preVals.preMatch,
                  match: event.target.value,
                });
              }}
              variant="standard"
              type="number"
              sx={{ width: "100%" }}
            />
          </Grid>
          <Grid item sm={6} textAlign="center">
            <BigCheckBox
              label="Showed up to match:"
              isChecked={preVals.preMatch.showed}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                preVals.setPre({
                  ...preVals.preMatch,
                  showed: event.target.checked,
                });
              }}
            />
          </Grid>
          <Grid item sm={6} textAlign="center">
            <BigCheckBox
              label="Bypassed:"
              isChecked={preVals.preMatch.bypassed}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                preVals.setPre({
                  ...preVals.preMatch,
                  bypassed: event.target.checked,
                });
              }}
            />
          </Grid>
        </Grid>
      </HeaderCard>
    </Page>
  );
}

export const AboutMemo = React.memo(PreMatch);
