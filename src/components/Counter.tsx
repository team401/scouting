import { Fab, Stack, Typography } from "@mui/material";
import React, { useState } from "react";

export function CounterButtons() {
  const [counter, setCounter] = useState(0);
  const [initialCount, setInitialCount] = useState(0);
  const handleInitialCountChange = (event: {
    target: { value: React.SetStateAction<number> };
  }) => {
    setInitialCount(event.target.value);
  };
  const handleReset = () => {
    setCounter(initialCount);
  };

  return (
    <Stack direction="row" justifyContent="center" alignItems="center">
      <Fab
        color="secondary"
        onClick={() => setCounter(counter > 0 ? counter - 1 : 0)}
      >
        -
      </Fab>
      <Typography textAlign="center" component="h1" variant="h4" sx={{ p: 2 }}>
        {counter}
      </Typography>
      <Fab
        color="secondary"
        aria-label="add"
        onClick={() => setCounter(counter + 1)}
      >
        +
      </Fab>
    </Stack>
  );
}
