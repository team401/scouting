import Chooser from "../Components/Chooser";
import { MouseEvent } from "react";
import AllianceSwitch from "../Components/AllianceSwitch";
import { useSettingsContext } from "../ContextProvider";
import React from "react";
import { Link } from "react-router-dom";
import PositionChooser from "../Components/PositionChooser";
import CompetitionSelector from "../Components/CompetitionSelector";
import { GetTeams } from "../Data";

export default function SettingsForm() {
  const { settings, setSettings } = useSettingsContext();
  return (
    <div className="flex flex-col items-center">
      <div className="font-semibold text-4xl text-center">Settings</div>
      <CompetitionSelector
        value={settings.Competition}
        onChange={(event: any, newValue: string | null) => {
          console.log("we do be value", newValue);
          if (!newValue) return;
          GetTeams(settings.Competition).then((value) => {
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
