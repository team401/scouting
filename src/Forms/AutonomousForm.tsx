import Chooser from "../Chooser";
import { MouseEvent, useState } from "react";
import AllianceSwitch from "../AllianceSwitch";
import {
  position,
  useAutoContext,
  useSettingsContext,
} from "../ContextProvider";
import React from "react";
import ScoreCounter from "../ScoreCounter";
import PositionChooser from "../PositionChooser";

type Props = { alliance: number; setAlliance: (alliance: number) => void };

export default function AutonomousForm() {
  const { auto, setAuto } = useAutoContext();
  const [comments, setComments] = React.useState("");
  const { settings, setSettings } = useSettingsContext();

  function handleSubmit(formData: MouseEvent<HTMLFormElement>) {
    formData.preventDefault();
    console.log("Submitted");
  }

  return (
    <div className="flex flex-col items-center">
      <form
        className="flex flex-col items-center justify-center"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col items-center justify-center">
          <div className="font-semibold text-4xl text-center">Autonomous</div>
          <div className="p-4 text-center">
            <div className="text-3xl pt-4"> Position</div>
            <div className="flex flex-row items-start justify-center p-4">
              <div className="flex flex-col items-end justify-center gap-2">
                <ScoreCounter
                  label="Speaker"
                  score={auto.UpperAuto}
                  setScore={(score) => setAuto({ ...auto, UpperAuto: score })}
                />
                <ScoreCounter
                  label="Amp"
                  score={auto.LowerAuto}
                  setScore={(score) => setAuto({ ...auto, LowerAuto: score })}
                />
              </div>
            </div>

            {/* comments section */}
            <div className="flex flex-col justify-center p-4">
              <label
                htmlFor="message"
                className="block mb-2 text-sm font-medium text-black text-left"
              >
                Your message
              </label>
              <textarea
                id="message"
                rows={4}
                className="block p-2.5 w-full text-sm text-black bg-transparent placeholder-black rounded-lg border border-black"
                placeholder="Write your thoughts here..."
              ></textarea>
            </div>
          </div>
        </div>

        <div className="flex flex-row items-center justify-center">
          <button
            className="bg-black bg-opacity-25 hover:bg-opacity-50 text-white font-bold py-2 px-4 rounded-full"
            type="submit"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
