import { Button, Fab, Link, Tab, Typography } from "@mui/material";
import React, { useState } from "react";
import Stack from "@mui/material/Stack";
type btnProps = {
  title: string | JSX.Element | number;
};
export default function StyledButton(props: btnProps) {
  return (
    <Button variant="contained" size="small" color="primary">
      <Typography color={"white"} textAlign="center" component="h1">
        {props.title}
      </Typography>
    </Button>
  );
}
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
    <Stack
      direction="row"
      spacing="4"
      justifyContent={"center"}
      alignItems={"center"}
      /**/
    >
      <Fab
        color="secondary"
        aria-label="subtract"
        onClick={() => setCounter(counter > 0 ? counter - 1 : 0)}
      >
        -
      </Fab>
      <Typography
        component="h1"
        color="primary"
        font-size="20px"
        align="center"
        sx={{ p: 2 }}
      >
        {" "}
        {counter}{" "}
      </Typography>
      <Fab
        color="primary"
        aria-label="add"
        onClick={() => setCounter(counter + 1)}
      >
        +
      </Fab>
    </Stack>
  );
}
