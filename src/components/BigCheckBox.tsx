import { Checkbox, FormControlLabel, Typography } from "@mui/material";
import React from "react";

type CBprops = {
  label: string;
  isChecked: boolean;
  onChange: Function;
};

export default function BigCheckBox(props: CBprops) {
  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={props.isChecked}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            props.onChange(event);
          }}
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
