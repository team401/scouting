import { Checkbox, FormControlLabel, Typography } from "@mui/material";
import React from "react";

type CBprops = {
  label: string;
  isChecked: boolean;
};

export default function BigCheckBox(props: CBprops) {
  return (
    <FormControlLabel
      control={
        <Checkbox
          defaultChecked={props.isChecked}
          sx={{ "& .MuiSvgIcon-root": { fontSize: 36 } }}
        />
      }
      label={
        <Typography variant="h6" component="h1">
          {props.label}
        </Typography>
      }
      labelPlacement="start"
      sx={{ fontSize: 36 }}
    />
  );
}
