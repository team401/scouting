//create the default function for a form
import { MouseEvent } from "react";
import React from "react";
import { useSettingsContext, useTeleopContext } from "../ContextProvider";
import ScoreCounter from "../Components/ScoreCounter";
import { Grid } from "@mui/material";
import ClimbSelector from "../Components/ClimbSelector";
import TrapSelector from "../Components/TrapSelector";
import CustomCheckbox from "../Components/CustomCheckbox";

export default function TeleopForm() {
  const { teleop, setTeleop } = useTeleopContext();
  const { settings, setSettings } = useSettingsContext();
  // const [highScore, setHighScore] = React.useState(0);
  // const [lowScore, setLowScore] = React.useState(0);

  return (
    <div className="flex flex-col items-center">
      <div className="">
        <h1 className="font-semibold text-4xl text-center">Teleop</h1>
        <div className="flex flex-row items-center justify-center"></div>
      </div>
      <div className="p-4">
        <div className="flex flex-row items-center justify-center ">
          <Grid
            container
            direction={"column"}
            spacing={2}
            flexShrink={8}
            justifyContent={"end"}
            alignItems={"end"}
          >
            <Grid item>
              <ScoreCounter
                label="Speaker Made"
                score={teleop.Speaker_Made}
                setScore={(score) =>
                  setTeleop({ ...teleop, Speaker_Made: score })
                }
              />
            </Grid>
            <Grid item>
              <ScoreCounter
                label="Speaker Missed"
                score={teleop.Speaker_Missed}
                setScore={(score) =>
                  setTeleop({ ...teleop, Speaker_Missed: score })
                }
              />
            </Grid>
            <Grid item>
              <ScoreCounter
                label="Amp Made"
                score={teleop.Amp_Made}
                setScore={(score) => setTeleop({ ...teleop, Amp_Made: score })}
              />
            </Grid>
            <Grid item>
              <ScoreCounter
                label="Amp Missed"
                score={teleop.Amp_Missed}
                setScore={(score) =>
                  setTeleop({ ...teleop, Amp_Missed: score })
                }
              />
            </Grid>
            <Grid item>
              <ClimbSelector />
            </Grid>
            <Grid item>
              <TrapSelector />
            </Grid>
            <Grid item justifyItems={"center"} alignItems={"center"}>
              <CustomCheckbox
                label="Disabled"
                value={teleop.Disabled}
                onChange={(event) => {
                  setTeleop({ ...teleop, Disabled: event.target.checked });
                }}
                color={settings.Alliance === "Red" ? "#DC2626" : "#2563EB"}
              />
            </Grid>
          </Grid>
        </div>

        {/* comments section */}
        <div className="flex flex-col items-center justify-center p-4">
          <label
            htmlFor="message"
            className="block mb-2 text-sm font-medium text-black"
          >
            Comments
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
    </div>
  );
}
