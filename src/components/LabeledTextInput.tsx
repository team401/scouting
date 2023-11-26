import { TextField, Typography } from "@mui/material";
import React, { PropsWithChildren } from "react";

type TextInputProps = {
  label: string;
  onChange: Function;
  value: string | number | null;
  type: React.HTMLInputTypeAttribute;
};

export default function LabeledTextInput(
  props: PropsWithChildren<TextInputProps>
) {
  return (
    <TextField
      id="scout-name"
      value={props.value}
      type={props.type}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
        props.onChange(event)
      }
      label={
        <Typography variant="h6" component="h1">
          {props.label}
        </Typography>
      }
      variant="standard"
      sx={{ width: "100%" }}
    />
  );
}
