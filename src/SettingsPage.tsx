import * as React from "react";
import { FormControl, Grid, InputLabel, MenuItem, Select } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import Page from "./components/Page";
import { HeaderButton } from "./components/HeaderCard";
import { Events, useSettingsContext } from "./ScoutingContexts";
import { Stations } from "./ScoutingContexts";

export default function Settings() {
  const settingsVals = useSettingsContext();

  const pageButtons: HeaderButton[] = [
    { title: <ArrowBackIcon fontSize="large" />, link: "/#/pre" },
  ];

  return (
    <Page title="Settings" buttons={pageButtons}>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Station Scouted</InputLabel>
          <Select
            value={settingsVals.settings.station}
            onChange={(event) => {
              settingsVals.setSettings({
                ...settingsVals.settings,
                station: event.target.value,
              });
            }}
            label="Station Scouted"
          >
            {Stations.map((station) => (
              <MenuItem key={station} value={station}>
                {station}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Event</InputLabel>
          <Select
            value={settingsVals.settings.event}
            onChange={(event) => {
              settingsVals.setSettings({
                ...settingsVals.settings,
                event: event.target.value,
              });
            }}
            label="Event"
          >
            {Events.map((event) => (
              <MenuItem key={event} value={event}>
                {event}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Page>
  );
}

export const SettingsMemo = React.memo(Settings);
