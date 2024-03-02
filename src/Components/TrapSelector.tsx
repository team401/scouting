import { Autocomplete, TextField } from "@mui/material";
import React from "react";
import { useTeleopContext } from "../ContextProvider";
import { GetTeamsEvent } from "../Data";

const opts = ["Not Attempted", "Attempted but Failed", "Succesful"];

export default function TrapSelector() {
  const { teleop, setTeleop } = useTeleopContext();

  return (
    <Autocomplete
      value={teleop.Trap}
      onChange={(event: any, newValue: string | null) => {
        if (!newValue) return;
        setTeleop({
          ...teleop,
          Trap: newValue,
        });
      }}
      clearOnEscape
      openText="false"
      options={opts}
      sx={{ width: 300 }}
      renderInput={(params) => <TextField {...params} label="Trap" />}
    />
  );
}
