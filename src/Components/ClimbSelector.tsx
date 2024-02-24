import { Autocomplete, TextField } from "@mui/material";
import React from "react";
import { useTeleopContext } from "../ContextProvider";
import { GetTeamsEvent } from "../Data";

const opts = [
  "Not Attempted",
  "Attempted but Failed",
  "Climbed",
  "Climbed with other Robot",
  "Parked",
];

export default function ClimbSelector() {
  const { teleop, setTeleop } = useTeleopContext();

  return (
    <Autocomplete
      value={teleop.EndGame}
      onChange={(event: any, newValue: string | null) => {
        if (!newValue) return;
        setTeleop({
          ...teleop,
          EndGame: newValue,
        });
      }}
      clearOnEscape
      options={opts}
      sx={{ width: 300 }}
      renderInput={(params) => <TextField {...params} label="Climb" />}
    />
  );
}
