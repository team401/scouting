import { Box, Checkbox, FormControlLabel } from "@mui/material";
import React, { SyntheticEvent } from "react";
import { useAutoContext } from "../ContextProvider";

type bxprops = {
  label: string;
  color: string;
  value: boolean;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean
  ) => void;
};
export default function CustomCheckbox(props: bxprops) {
  const { auto, setAuto } = useAutoContext();
  return (
    <Box>
      <FormControlLabel
        label={props.label}
        control={
          <Checkbox
            sx={{
              "&.Mui-checked": {
                color: props.color,
              },
            }}
            value={props.value}
            onChange={props.onChange}
            checked={props.value}
          />
        }
      />
    </Box>
  );
}
