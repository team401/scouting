import * as React from "react";
import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";
import { useSettingsContext } from "./ContextProvider";
import { GetTeams } from "./Data";
import SettingsForm from "./Forms/SettingsForm";
import PreMatchForm from "./Forms/PreMatchForm";
import AutonomousForm from "./Forms/AutonomousForm";
import TeleopForm from "./Forms/TeleopForm";

export default function App() {
  const { settings } = useSettingsContext();

  return (
    <div
      className={`transition min-h-screen w-screen font-sans flex flex-col items-center
      ${settings.Alliance == "Red" ? "bg-red-bg" : "bg-blue-bg"}`}
    >
      {/* <div className="transition min-h-screen w-screen font-sans flex flex-col items-center bg-white"> */}
      <div className="w-11/12 h-full md:h-min md:w-min">
        {/* <NavBar /> */}
        <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-full h-full">
          {/* the Outlet element is used to give react-router a place to put the children of this component.
              every route is rendered in the App component, so that the NavBar is shown. Every other route is
              shown within this App component, rendered where the Outlet tag is in this file. */}
          {/* <Outlet /> */}
          <div className="min-h-screen">
            <div className="grid grid-flow-rows row-auto-max">
              <SettingsForm />
              <PreMatchForm />
              <AutonomousForm />
              <TeleopForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
