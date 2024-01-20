import * as React from "react";
import clsx from "clsx";
import { styled } from "@mui/system";
import { alliance, position, useSettingsContext } from "./ContextProvider";
import { useSwitch, UseSwitchParameters } from "@mui/base/useSwitch";
import { MouseEvent } from "react";
import Chooser from "./Chooser";

export default function AllianceSwitch() {
  const { settings, setSettings } = useSettingsContext();

  const chooserLabels =
    settings.Alliance == "Red"
      ? ["Red 1", "Red 2", "Red 3"]
      : ["Blue 1", "Blue 2", "Blue 3"];
  return (
    <Chooser
      value={settings.Position}
      setValue={(value: position) => {
        setSettings({
          ...settings,
          Position: value,
        });
      }}
      value1={chooserLabels[0]}
      value2={chooserLabels[1]}
      value3={chooserLabels[2]}
      checkedColor={settings.Alliance === "Red" ? "#DC2626" : "#2563EB"}
    />
  );
}
