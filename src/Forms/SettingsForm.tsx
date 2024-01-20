import Chooser from "../Chooser";
import { MouseEvent } from "react";
import AllianceSwitch from "../AllianceSwitch";
import { useSettingsContext } from "../ContextProvider";
import React from "react";
import { Link } from "react-router-dom";
import PositionChooser from "../PositionChooser";
import CompetitionSelector from "../CompetitionSelector";

export default function SettingsForm() {
  const { settings, setSettings } = useSettingsContext();
  return (
    <div className="flex flex-col items-center">
      <div className="font-semibold text-4xl text-center">Settings</div>
      <CompetitionSelector />
      <div className="text-3xl pt-4"> Alliance</div>
      <AllianceSwitch />
      <div className="text-3xl pt-4"> Position</div>
      <PositionChooser />
    </div>
  );
}
