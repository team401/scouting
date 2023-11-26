import * as React from "react";
import { Grid } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import Page from "./components/Page";
import { HeaderButton } from "./components/HeaderCard";
import { useAutoContext } from "./ScoutingContexts";

export default function Settings() {
  const autoVals = useAutoContext();

  const pageButtons: HeaderButton[] = [
    { title: <ArrowBackIcon fontSize="large" />, link: "/#/pre" },
  ];

  return <Page title="Settings" buttons={pageButtons}></Page>;
}

export const SettingsMemo = React.memo(Settings);
