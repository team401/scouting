import { Fab, Grid, Stack, Typography } from "@mui/material";
import React from "react";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

type CounterProps = {
  label: string;
  value: number;
  onChange: Function;
};

export function Counter(props: CounterProps) {
  function decrement(e: any) {
    e.preventDefault();
    props.onChange(props.value - 1);
  }

  function increment(e: any) {
    e.preventDefault();
    props.onChange(props.value + 1);
  }

  return (
    <Grid container item xs={12}>
      <Grid item xs={6} justifyContent="right">
        <Typography
          textAlign="right"
          component="h1"
          variant="h6"
          sx={{ px: 5, py: 2 }}
        >
          {props.label}
        </Typography>
      </Grid>
      <Grid item xs={6}>
        <Stack direction="row">
          <Fab onTouchEnd={decrement} onClick={decrement}>
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
          <Fab onTouchEnd={increment} onClick={increment}>
            <AddIcon fontSize="large" />
          </Fab>
        </Stack>
      </Grid>
    </Grid>
  );
}
