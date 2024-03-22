import * as React from "react";
import { Outlet } from "react-router-dom";
import NavBar from "./Components/NavBar";
import {
  defaultAuto,
  defaultTeleop,
  useAutoContext,
  usePreMatchContext,
  useSettingsContext,
  useTeleopContext,
} from "./ContextProvider";
import { GetTeamsEvent } from "./Data";
import SettingsForm from "./Forms/SettingsForm";
import PreMatchForm from "./Forms/PreMatchForm";
import AutonomousForm from "./Forms/AutonomousForm";
import TeleopForm from "./Forms/TeleopForm";
import { useState } from "react";
import supabase from "./Supabase/supabaseClient";
import FullTeamGraph from "./DataViz/FullTeamGraph";
import QR from "./Components/QRCode";

export default function App() {
  const { settings, setSettings } = useSettingsContext();
  const { preMatch, setPreMatch } = usePreMatchContext();
  const { auto, setAuto } = useAutoContext();
  const { teleop, setTeleop } = useTeleopContext();
  const [formError, setFormError] = useState("");

  return (
    <div
      className={`transition min-h-screen w-screen font-sans flex flex-col items-center
      ${settings.Alliance == "Red" ? "bg-red-bg" : "bg-blue-bg"}`}
    >
      <NavBar />
      <Outlet />
    </div>
  );
}
