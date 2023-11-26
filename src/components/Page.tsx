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
    <Container maxWidth="lg" sx={{ pt: "20px", height: "calc(100vh - 80px)" }}>
      <HeaderCard title={props.title} buttons={props.buttons}>
        <Grid container rowSpacing={8} columnSpacing={1}>
          {props.children}
        </Grid>
      </HeaderCard>
    </Container>
  );
}
