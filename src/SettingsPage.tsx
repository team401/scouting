import * as React from "react";
import { FormControl, Grid, InputLabel, MenuItem, Select } from "@mui/material";
import axios from "axios";

import Page from "./components/Page";
import { HeaderButton } from "./components/HeaderCard";
import { Events, useSettingsContext } from "./ScoutingContexts";
import { Stations } from "./ScoutingContexts";

axios.defaults.baseURL = "https://www.thebluealliance.com/api/v3/event/";
axios.defaults.withCredentials = false;
axios.defaults.headers["X-TBA-Auth-Key"] =
  "u8L8Gd05IPCUmwjradkV0NbM7Y5Z7hx1fQc0SPx4vj6oPqKFCNGDiwZmlAhJ6SO8 ";

export default function Settings() {
  const settings = useSettingsContext();

  React.useEffect(() => {
    fetchTeams();
  }, [settings.data.event]);

  function fetchTeams() {
    const path = settings.data.event + "/teams/simple";
    axios.get(path).then((res) => {
      res.data.forEach((e: any) => {
        console.log(e.team_number, e.nickname);
      });
    });
  }

  const pageButtons: HeaderButton[] = [
    { title: "Back to Scouting", link: "/#/pre" },
  ];

  return (
    <Page title="Settings" buttons={pageButtons}>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Station Scouted</InputLabel>
          <Select
            value={settings.data.station}
            onChange={(event) => {
              settings.setData({
                ...settings.data,
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
            value={settings.data.event}
            onChange={(event) => {
              settings.setData({
                ...settings.data,
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
