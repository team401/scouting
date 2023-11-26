import { Box, Container, Grid } from "@mui/material";
import React from "react";
import { PropsWithChildren } from "react";
import HeaderCard, { HeaderButton } from "./HeaderCard";

type PageProps = {
  title: string;
  buttons: HeaderButton[];
};

export default function Page(props: PropsWithChildren<PageProps>) {
  return (
    <Container maxWidth="lg" sx={{ pt: 4 }}>
      <HeaderCard title={props.title} buttons={props.buttons}>
        <Grid container rowSpacing={5} columnSpacing={1}>
          {props.children}
        </Grid>
      </HeaderCard>
      <Box textAlign="center"></Box>
    </Container>
  );
}
