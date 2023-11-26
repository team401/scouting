import * as React from "react";
import { Grid } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import Page from "./components/Page";
import { HeaderButton } from "./components/HeaderCard";
import { useAutoContext } from "./ScoutingContexts";
import { Counter } from "./components/Counter";
import BigCheckBox from "./components/BigCheckBox";

export default function Auto() {
  const autoVals = useAutoContext();

  const pageButtons: HeaderButton[] = [
    { title: <ArrowBackIcon fontSize="large" />, link: "/#/pre" },
    { title: <ArrowForwardIcon fontSize="large" />, link: "/#/teles" },
  ];

  return (
    <Page title="Auto" buttons={pageButtons}>
      <Grid item xs={12}>
        <Counter
          label="Scored High"
          value={autoVals.auto.scoredHigh}
          onChange={(newVal: number) => {
            navigator.vibrate(50);
            autoVals.setAuto({
              ...autoVals.auto,
              scoredHigh: newVal < 0 ? 0 : newVal,
            });
          }}
        ></Counter>
      </Grid>
      <Grid item xs={12}>
        <Counter
          label="Scored Mid "
          value={autoVals.auto.scoredMid}
          onChange={(newVal: number) => {
            navigator.vibrate(50);
            autoVals.setAuto({
              ...autoVals.auto,
              scoredMid: newVal < 0 ? 0 : newVal,
            });
          }}
        ></Counter>
      </Grid>
      <Grid item xs={12}>
        <Counter
          label="Scored Low "
          value={autoVals.auto.scoredLow}
          onChange={(newVal: number) => {
            navigator.vibrate(50);
            autoVals.setAuto({
              ...autoVals.auto,
              scoredLow: newVal < 0 ? 0 : newVal,
            });
          }}
        ></Counter>
      </Grid>
      <Grid item xs={12}>
        <Counter
          label="Missed"
          value={autoVals.auto.missed}
          onChange={(newVal: number) => {
            navigator.vibrate(50);
            autoVals.setAuto({
              ...autoVals.auto,
              missed: newVal < 0 ? 0 : newVal,
            });
          }}
        ></Counter>
      </Grid>
      <Grid item xs={6} textAlign="center">
        <BigCheckBox
          label="Exited Zone:"
          isChecked={autoVals.auto.exitedZone}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            navigator.vibrate(50);
            autoVals.setAuto({
              ...autoVals.auto,
              exitedZone: event.target.checked,
            });
          }}
        />
      </Grid>
      <Grid item xs={6} textAlign="center">
        <BigCheckBox
          label="Balanced: "
          isChecked={autoVals.auto.balanced}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            navigator.vibrate(50);
            autoVals.setAuto({
              ...autoVals.auto,
              balanced: event.target.checked,
            });
          }}
        />
      </Grid>
    </Page>
  );
}

export const AboutMemo = React.memo(Auto);
