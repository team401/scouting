import * as React from "react";

import Page from "./components/Page";
import HeaderCard, { HeaderButton } from "./components/HeaderCard";

import { Autocomplete, Grid, TextField, Typography } from "@mui/material";
import BigCheckBox from "./components/BigCheckBox";

export default function About() {
  const pageButtons: HeaderButton[] = [
    { title: "Prev Page (Pre-Match)", link: "/#/pre" },
    { title: "Next page (Tele)", link: "/#/teles" },
  ];

  return (
    <Page>
      <HeaderCard title={"Auto"} buttons={pageButtons}>
        <Grid container rowSpacing={2} columnSpacing={1}>
          <Grid item xs={12}>
            <TextField
              id="scout-name"
              label={
                <Typography variant="h6" component="h1">
                  Scout Name
                </Typography>
              }
              variant="standard"
              sx={{ width: "100%" }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              id="match-num"
              label={
                <Typography variant="h6" component="h1">
                  Match Number
                </Typography>
              }
              variant="standard"
              type="number"
              sx={{ width: "100%" }}
            />
          </Grid>
          <Grid item sm={6} textAlign="center">
            <BigCheckBox label="Showed up to match:" isChecked />
          </Grid>
          <Grid item sm={6} textAlign="center">
            <BigCheckBox label="Bypassed:" isChecked={false} />
          </Grid>
        </Grid>
      </HeaderCard>
    </Page>
  );
}

export const AboutMemo = React.memo(About);
