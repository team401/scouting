import * as React from "react";
import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";
import {
  defaultAuto,
  defaultTeleop,
  useAutoContext,
  usePreMatchContext,
  useSettingsContext,
  useTeleopContext,
} from "./ContextProvider";
import { GetTeams } from "./Data";
import SettingsForm from "./Forms/SettingsForm";
import PreMatchForm from "./Forms/PreMatchForm";
import AutonomousForm from "./Forms/AutonomousForm";
import TeleopForm from "./Forms/TeleopForm";
import { useState } from "react";
import supabase from "./Supabase/supabaseClient";

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
      {/* <div className="transition min-h-screen w-screen font-sans flex flex-col items-center bg-white"> */}
      <div className="w-11/12 h-full md:h-min md:w-min">
        {/* <NavBar /> */}

        {/* the Outlet element is used to give react-router a place to put the children of this component.
              every route is rendered in the App component, so that the NavBar is shown. Every other route is
              shown within this App component, rendered where the Outlet tag is in this file. */}
        {/* <Outlet /> */}
        <div className="min-h-screen">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-auto-rows-auto gap-y-3">
              <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-full h-full">
                <SettingsForm />
              </div>
              <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-full h-full">
                <PreMatchForm />
              </div>
              <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-full h-full">
                <AutonomousForm />
              </div>
              <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-full h-full">
                <TeleopForm />
                <button
                  className="bg-black bg-opacity-25 hover:bg-opacity-50 text-white font-bold py-2 px-4 rounded-full"
                  type="submit"
                >
                  Submit
                </button>
              </div>

              {formError && <p className="error"> {formError}</p>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
