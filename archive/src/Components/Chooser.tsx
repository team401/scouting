import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import React, { useEffect } from "react";
import { position, positions } from "../ContextProvider";

type chsrProps = {
  title?: string | JSX.Element | number;
  value: position;
  setValue: (value: position) => void;
  value1: string | JSX.Element | number;
  value2: string | JSX.Element | number;
  value3?: string | JSX.Element | number;
  value4?: string | JSX.Element | number;
  value5?: string | JSX.Element | number;
  value6?: string | JSX.Element | number;
  color?: string;
  checkedColor: string;
};

export default function Chooser(props: chsrProps) {
  useEffect(() => {}, [props.value1, props.value2, props.value3]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = (e.target as HTMLInputElement).value;
    const validPosition = positions.find((pos) => pos === value);
    if (validPosition) {
      props.setValue(validPosition);
    }
  };

  return (
    <FormControl>
      <FormLabel id="demo-radio-buttons-group-label">{props.title}</FormLabel>
      <RadioGroup
        aria-labelledby="demo-radio-buttons-group-label"
        defaultValue={1}
        name="radio-buttons-group"
        color={props.color}
        value={props.value}
        onChange={handleChange}
      >
        <FormControlLabel
          value={"1" as position}
          control={
            <Radio
              sx={{
                "&.Mui-checked": {
                  color: props.checkedColor,
                },
              }}
            />
          }
          label={props.value1}
        />
        <FormControlLabel
          value={"2" as position}
          control={
            <Radio
              sx={{
                "&.Mui-checked": {
                  color: props.checkedColor,
                },
              }}
            />
          }
          label={props.value2}
        />
        <FormControlLabel
          value={"3" as position}
          control={
            <Radio
              sx={{
                "&.Mui-checked": {
                  color: props.checkedColor,
                },
              }}
            />
          }
          label={props.value3}
        />
      </RadioGroup>
    </FormControl>
  );
}
