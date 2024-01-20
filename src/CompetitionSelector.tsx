import { Autocomplete, TextField } from "@mui/material";
import React from "react";
import { alliance, position, useSettingsContext } from "./ContextProvider";
import { GetTeams } from "./Data";

const comps = [
  "2024chcmp",
  "2024mdowi",
  "2024mdsev",
  "2024vaash",
  "2024vabla",
  "2024vafal",
  "2024vagle",
  "2024vapor",
];

export default function CompetitionSelector() {
  const { settings, setSettings } = useSettingsContext();
  console.log(settings.FrcTeams);

  return (
    <Autocomplete
      value={settings.Competition}
      onChange={(event: any, newValue: string | null) => {
        console.log("we do be value", newValue);
        if (!newValue) return;
        GetTeams(settings.Competition).then((value) => {
          setSettings({
            ...settings,
            Competition: newValue,
            FrcTeams: value, // 😳
          });
        });
      }}
      clearOnEscape
      options={comps}
      sx={{ width: 300 }}
      renderInput={(params) => <TextField {...params} label="Competition" />}
    />
  );
}
