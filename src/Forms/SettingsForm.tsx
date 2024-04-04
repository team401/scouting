import Chooser from "../Components/Chooser";
import { MouseEvent } from "react";
import AllianceSwitch from "../Components/AllianceSwitch";
import { useSettingsContext } from "../ContextProvider";
import React from "react";
import { Link } from "react-router-dom";
import PositionChooser from "../Components/PositionChooser";
import CompetitionSelector from "../Components/CompetitionSelector";
import { GetTeamsEvent } from "../Data";
import { TextField } from "@mui/material";

export default function SettingsForm() {
  const { settings, setSettings } = useSettingsContext();
  return (
    <div className="flex flex-col items-center">
      <div className="font-semibold text-4xl text-center">Settings</div>
      <br></br>
      <TextField
        id="outlined-basic"
        label="Initials"
        variant="outlined"
        color={"primary"}
        margin="normal"
        value={settings.Initials}
        onChange={(event: any) => {
          setSettings({ ...settings, Initials: event.target.value! });
        }}
      />
      <CompetitionSelector
        value={settings.Competition}
        onChange={(event: any, newValue: string | null) => {
          console.log("we do be value", newValue);
          if (!newValue) return;
          GetTeamsEvent(newValue).then((value) => {
            setSettings({
              ...settings,
              Competition: newValue,
              FrcTeams: value, // 😳
            });
          });
        }}
      />
      <div className="text-3xl pt-4"> Alliance</div>
      <AllianceSwitch />
      <div className="text-3xl pt-4"> Position</div>
      <PositionChooser />
    </div>
  );
}
