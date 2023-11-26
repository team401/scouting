import React from "react";
import { Box, Card, CardActions, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { PropsWithChildren } from "react";

import StyledButton from "./StyledButton";

export type HeaderButton = {
  link: string;
  title: JSX.Element | string;
};

type HeaderCardProps = {
  title: JSX.Element | string;
  buttons: HeaderButton[];
};

export default function HeaderCard(props: PropsWithChildren<HeaderCardProps>) {
  return (
    <Card
      sx={{
        mb: 0,
        p: 2,
        mx: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
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
      <>{props.children}</>
      <CardActions
        sx={
          props.buttons.length > 1
            ? {
                justifyContent: "space-between",
                mt: "auto",
                mb: -1,
                mx: -3,
              }
            : { justifyContent: "center", mt: "auto", mb: -1, mx: -3 }
        }
      >
        {props.buttons?.map((button) => (
          <StyledButton
            link={button.link}
            key={button.link}
            title={button.title}
          />
        ))}
      </CardActions>
    </Card>
  );
}
