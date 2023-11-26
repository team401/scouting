import * as React from "react";
import { Autocomplete, Grid, TextField, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SettingsIcon from "@mui/icons-material/Settings";

import Page from "./components/Page";
import { HeaderButton } from "./components/HeaderCard";
import BigCheckBox from "./components/BigCheckBox";

import { usePreContext } from "./ScoutingContexts";
import { teamsList } from "./EventTeams";
import LabeledTextInput from "./components/LabeledTextInput";

export default function PreMatch() {
  const preVals = usePreContext();

  const pageButtons: HeaderButton[] = [
    { title: <SettingsIcon fontSize="large" />, link: "/#/settings" },
    { title: <ArrowForwardIcon fontSize="large" />, link: "/#/auto" },
  ];

  return (
    <Page title="Pre-Match" buttons={pageButtons}>
      <Grid item xs={12}>
        <LabeledTextInput
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            preVals.setPre({
              ...preVals.preMatch,
              scout: event.target.value,
            });
          }}
          label="Scout Name"
          value={preVals.preMatch.scout}
          type="text"
        />
      </Grid>
      <Grid item xs={12}>
        <Autocomplete
          disablePortal
          options={teamsList}
          getOptionLabel={(option) => option.toString()}
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
        <LabeledTextInput
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            preVals.setPre({
              ...preVals.preMatch,
              match: event.target.value,
            });
          }}
          label="Match Number"
          value={preVals.preMatch.match}
          type="number"
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
    </Page>
  );
}

export const PreMatchMemo = React.memo(PreMatch);
