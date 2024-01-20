//create the default function for a form
import Chooser from "../Chooser";
import { MouseEvent } from "react";
import AllianceSwitch from "../AllianceSwitch";
import React from "react";
import { useSettingsContext, useTeleopContext } from "../ContextProvider";
import ScoreCounter from "../ScoreCounter";
import PositionChooser from "../PositionChooser";

type Props = { alliance: number; setAlliance: (alliance: number) => void };

export default function TeleopForm() {
  const { teleop, setTeleop } = useTeleopContext();
  // const [highScore, setHighScore] = React.useState(0);
  // const [lowScore, setLowScore] = React.useState(0);
  const [comments, setComments] = React.useState("");

  const { settings } = useSettingsContext();

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
        <div className="">
          <h1 className="font-semibold text-4xl text-center">Teleop</h1>
          <div className="flex flex-row items-center justify-center"></div>
        </div>
        <div className="p-4">
          <div className="flex flex-row items-center justify-center p-4">
            <div className="flex flex-col items-end justify-center gap-2">
              <ScoreCounter
                label="Speaker"
                score={teleop.UpperTele}
                setScore={(score) => setTeleop({ ...teleop, UpperTele: score })}
              />
              <ScoreCounter
                label="Amp"
                score={teleop.LowerTele}
                setScore={(score) => setTeleop({ ...teleop, LowerTele: score })}
              />
            </div>
          </div>

          {/* comments section */}
          <div className="flex flex-col items-center justify-center p-4">
            <label
              htmlFor="message"
              className="block mb-2 text-sm font-medium text-black"
            >
              Your message
            </label>
            <textarea
              id="message"
              rows={4}
              value={teleop.Text}
              onChange={(event) =>
                setTeleop({ ...teleop, Text: event.currentTarget.value })
              }
              className="block p-2.5 w-full text-sm text-black bg-transparent placeholder-black rounded-lg border border-black"
              placeholder="Write your thoughts here..."
            ></textarea>
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
