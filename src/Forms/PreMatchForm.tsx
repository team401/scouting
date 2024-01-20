import Chooser from "../Chooser";
import { MouseEvent } from "react";
import AllianceSwitch from "../AllianceSwitch";
import { useSettingsContext, usePreMatchContext } from "../ContextProvider";
import React from "react";
import { Link } from "react-router-dom";
import { GetTeams } from "../Data";
import TeamSelector from "../TeamSelector";

export default function PreMatchForm() {
  const { settings, setSettings } = useSettingsContext();
  return (
    <div className="flex flex-col items-center">
      <div className="font-semibold text-4xl text-center">PreMatch</div>
      <TeamSelector />
    </div>
  );
}
