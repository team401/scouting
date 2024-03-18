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
import AverageTeamGraph from "./DataViz/AverageTeamGraph";
import QR from "./Components/QRCode";

export default function App() {
  const { settings, setSettings } = useSettingsContext();
  const { preMatch, setPreMatch } = usePreMatchContext();
  const { auto, setAuto } = useAutoContext();
  const { teleop, setTeleop } = useTeleopContext();
  const [formError, setFormError] = useState("");

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (preMatch.Team == "" || preMatch.Match == undefined) {
      setFormError("Please fill out form correctly");
      return;
    }
    const { error } = await supabase.from("Scout_Data").insert({
      Event: settings.Competition,
      team: preMatch.Team,
      Match: preMatch.Match,
      NoShow: preMatch.NoShow,
      Alliance: settings.Alliance,
      Position: settings.Position,
      Auto_Amp_Missed: auto.Amp_Missed,
      Auto_Amp_Made: auto.Amp_Made,
      Auto_Speaker_Missed: auto.Speaker_Missed,
      Auto_Speaker_Made: auto.Speaker_Made,
      Taxi: auto.Taxi,
      Teleop_Amp_Missed: teleop.Amp_Missed,
      Teleop_Amp_Made: teleop.Amp_Made,
      Teleop_Speaker_Missed: teleop.Speaker_Missed,
      Teleop_Speaker_Made: teleop.Speaker_Made,
      Endgame: teleop.EndGame,
      Comments: teleop.Text,
    });
    if (error) {
      console.log(error);
      setFormError("Please fill out form correctly");
    }

    console.log("we are bojanglin");
    setPreMatch({
      ...preMatch,
      Team: "",
      Match: preMatch.Match! + 1,
      NoShow: false,
    });
    setAuto({ ...defaultAuto });
    setTeleop(defaultTeleop);
    console.log(preMatch.NoShow);
  };

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
