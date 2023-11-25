import React from "react";
import { Card, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { PropsWithChildren } from "react";

import StyledButton from "./StyledButton";

export type HeaderButton = {
  link: string;
  title: JSX.Element | string;
};

type HeaderCardProps = {
  title: JSX.Element | string;
  buttons?: HeaderButton[];
};

export default function HeaderCard(props: PropsWithChildren<HeaderCardProps>) {
  return (
    <Grid xs={12}>
      <Card sx={{ mb: 4, p: 2, mx: 0 }}>
        <Typography
          variant="h4"
          align="left"
          color="text.secondary"
          component="h1"
          paddingBottom={2}
          textAlign="center"
        >
          {props.title}
        </Typography>
        <Typography
          variant="h6"
          align="left"
          color="text.secondary"
          component="h1"
        >
          {props.children}
        </Typography>
        <Stack
          direction="row"
          justifyContent="center"
          alignContent="center"
          sx={{ pb: 0, mb: 0 }}
        >
          {props.buttons?.map((button) => (
            <StyledButton
              link={button.link}
              key={button.link}
              title={button.title}
            />
          ))}
        </Stack>
      </Card>
    </Grid>
  );
}
