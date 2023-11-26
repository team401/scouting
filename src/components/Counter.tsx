import { Fab, Stack, Typography } from "@mui/material";
import React from "react";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

type CounterProps = {
  label: string;
  value: number;
  onChange: Function;
};

export function Counter(props: CounterProps) {
  return (
    <Stack direction="row" justifyContent="center">
      <Typography
        textAlign="center"
        component="h1"
        variant="h6"
        sx={{ px: 5, py: 2 }}
      >
        {props.label}
      </Typography>
      <Fab onClick={(e) => props.onChange(props.value - 1)}>
        <RemoveIcon fontSize="large" />
      </Fab>
      <Typography
        textAlign="center"
        component="h1"
        variant="h4"
        sx={{ px: 5, py: 2 }}
      >
        {props.value}
      </Typography>
      <Fab onClick={(e) => props.onChange(props.value + 1)}>
        <AddIcon fontSize="large" />
      </Fab>
    </Stack>
  );
}
