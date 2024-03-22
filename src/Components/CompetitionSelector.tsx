import {
  Autocomplete,
  AutocompleteCloseReason,
  TextField,
} from "@mui/material";
import React, { ReactEventHandler, SyntheticEvent } from "react";
import { alliance, position, useSettingsContext } from "../ContextProvider";
import { GetTeamsEvent } from "../Data";

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
type selectprops = {
  value: string;
  onChange: (
    event: SyntheticEvent<Element, Event>,
    value: string | null
  ) => void;
};
export default function CompetitionSelector(props: selectprops) {
  const { settings, setSettings } = useSettingsContext();
  console.log(settings.FrcTeams);

  return (
    <Autocomplete
      value={props.value}
      onChange={props.onChange}
      autoSelect={true}
      autoHighlight
      options={comps}
      sx={{ width: 200 }}
      renderInput={(params) => <TextField {...params} label="Competition" />}
    />
  );
}
