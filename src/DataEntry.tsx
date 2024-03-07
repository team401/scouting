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

export default function DataEntry() {
  const { settings, setSettings } = useSettingsContext();
  const { preMatch, setPreMatch } = usePreMatchContext();
  const { auto, setAuto } = useAutoContext();
  const { teleop, setTeleop } = useTeleopContext();
  const [formError, setFormError] = useState("");
  const [qrcontent, setQRContent] = useState("");
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
      Trap: teleop.Trap,
      Comments: teleop.Text,
      Playoffs: preMatch.Playoffs,
    });

    if(!error) {
      // compute and send averages
      const { data, error: avgError } = await supabase.from("Averages")
          .select(
              "teamNumber, matchesPlayed, teleAmp, teleSpeaker, autoAmp, autoSpeaker, climb, trapPercent, taxiPercent"
          )
          .eq(
              "teamNumber", parseInt(preMatch.Team)
          )
          .eq(
              "event", settings.Competition
          );
      if (avgError) {
        console.error(avgError.message);
      } else if (data == null) {
        // create column ( first match added )
        let climbPoints = 0;
        if(teleop.EndGame === "Parked") {
          climbPoints = 1;
        } else if (teleop.EndGame === "Climbed") {
          climbPoints = 3;
        } else {
          climbPoints = 5;
        }
        const {error: sendError } = await supabase.from("Average").insert({
          teamNumber: parseInt(preMatch.Team),
          event: settings.Competition,
          matchesPlayed: 1,
          teleAmp: teleop.Amp_Made,
          teleSpeaker: teleop.Speaker_Made,
          autoAmp: auto.Amp_Made,
          autoSpeaker: auto.Speaker_Made,
          climb: climbPoints,
          trapPercent: teleop.Trap === "Successful" ? 100 : 0,
          taxiPercent: auto.Taxi ? 100 : 0
        })
      }
    }

    setQRContent(
      "Event,Match,team,NoShow,Alliance,Position,Auto_Amp_Missed,Auto_Amp_Made,Auto_Speaker_Missed,Auto_Speaker_Made,Taxi,Teleop_Amp_Missed,Teleop_Amp_Made,Teleop_Speaker_Missed,Teleop_Speaker_Made,Endgame,Trap,Comments, Playoffs" +
        "\n" +
        [
          settings.Competition,
          preMatch.Match!,
          preMatch.Team!,
          preMatch.NoShow!,
          settings.Alliance!,
          settings.Position!,
          auto.Amp_Missed!,
          auto.Amp_Made!,
          auto.Speaker_Missed!,
          auto.Speaker_Made!,
          auto.Taxi!,
          teleop.Amp_Missed!,
          teleop.Amp_Made!,
          teleop.Speaker_Missed!,
          teleop.Speaker_Made!,
          teleop.EndGame!,
          teleop.Trap!,
          teleop.Text!,
          preMatch.Playoffs!,
        ].toString()
    );
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
    if (error) {
      console.log(error);
      setFormError(`Error: ${error.message} (please use QR code)`);
      return;
    }
    setFormError("");
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
            <div className="grid grid-auto-rows-auto gap-y-3 mb-5">
              <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-full h-full">
                <SettingsForm />
              </div>
              <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-full h-full">
                <PreMatchForm />
              </div>
              <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-full h-full">
                <AutonomousForm />
              </div>
              <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-full h-full gap-y-2 mb-5">
                <TeleopForm />
                <button
                  className="bg-black bg-opacity-25 hover:bg-opacity-50 text-white font-bold py-2 px-4 rounded-full "
                  type="submit"
                >
                  Submit
                </button>
              </div>

              {formError && <p className="error"> {formError}</p>}
            </div>
          </form>
          <div className="box mb-4 py-4">
            <QR value={qrcontent} />
          </div>
          <br></br>
          <br></br>
          <br></br>
        </div>
      </div>
    </div>
  );
}
