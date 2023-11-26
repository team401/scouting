import * as React from "react";
import { Grid } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import Page from "./components/Page";
import { HeaderButton } from "./components/HeaderCard";
import { useTeleContext } from "./ScoutingContexts";
import { Counter } from "./components/Counter";
import BigCheckBox from "./components/BigCheckBox";

export default function Tele() {
  const tele = useTeleContext();

  const pageButtons: HeaderButton[] = [
    { title: <ArrowBackIcon fontSize="large" />, link: "/#/auto" },
    { title: <ArrowForwardIcon fontSize="large" />, link: "/#/post" },
  ];

  return (
    <Page title="Tele" buttons={pageButtons}>
      <Grid item xs={12}>
        <Counter
          label="Scored High"
          value={tele.data.scoredHigh}
          onChange={(newVal: number) => {
            navigator.vibrate(50);
            tele.setData({
              ...tele.data,
              scoredHigh: newVal < 0 ? 0 : newVal,
            });
          }}
        ></Counter>
      </Grid>
      <Grid item xs={12}>
        <Counter
          label="Scored Mid "
          value={tele.data.scoredMid}
          onChange={(newVal: number) => {
            navigator.vibrate(50);
            tele.setData({
              ...tele.data,
              scoredMid: newVal < 0 ? 0 : newVal,
            });
          }}
        ></Counter>
      </Grid>
      <Grid item xs={12}>
        <Counter
          label="Scored Low "
          value={tele.data.scoredLow}
          onChange={(newVal: number) => {
            navigator.vibrate(50);
            tele.setData({
              ...tele.data,
              scoredLow: newVal < 0 ? 0 : newVal,
            });
          }}
        ></Counter>
      </Grid>
      <Grid item xs={12}>
        <Counter
          label="Missed"
          value={tele.data.missed}
          onChange={(newVal: number) => {
            navigator.vibrate(50);
            tele.setData({
              ...tele.data,
              missed: newVal < 0 ? 0 : newVal,
            });
          }}
        ></Counter>
      </Grid>
      <Grid item xs={12} textAlign="center">
        <BigCheckBox
          label="Balanced: "
          isChecked={tele.data.balanced}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            navigator.vibrate(50);
            tele.setData({
              ...tele.data,
              balanced: event.target.checked,
            });
          }}
        />
      </Grid>
    </Page>
  );
}

export const TeleMemo = React.memo(Tele);
