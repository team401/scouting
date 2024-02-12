import Chooser from "../Chooser";
import { MouseEvent, useEffect, useState } from "react";
import AllianceSwitch from "../AllianceSwitch";
import {
  position,
  useAutoContext,
  useSettingsContext,
} from "../ContextProvider";
import React from "react";
import ScoreCounter from "../ScoreCounter";
import PositionChooser from "../PositionChooser";
import { Box, Checkbox, FormControlLabel, Grid } from "@mui/material";
import { Fullscreen } from "@mui/icons-material";
import CustomCheckbox from "../CustomCheckbox";

type chsrProps = { color?: string };

export default function AutonomousForm(props: chsrProps) {
  const { auto, setAuto } = useAutoContext();
  const [comments, setComments] = React.useState("");
  const { settings, setSettings } = useSettingsContext();

  function handleSubmit(formData: MouseEvent<HTMLFormElement>) {
    formData.preventDefault();
    console.log("Submitted");
  }

  console.log("auto.Taxi according to Auto form:", auto.Taxi);

  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-col items-center justify-center align-middle">
        <div className="font-semibold text-4xl text-center">Autonomous</div>
        <div className="p-4 text-center">
          <Grid
            container
            spacing={2}
            direction={"column"}
            flexShrink={8}
            justifyContent={"end"}
            alignItems={"end"}
          >
            <Grid item>
              <ScoreCounter
                label="Speaker Made"
                score={auto.Speaker_Made}
                setScore={(score) => setAuto({ ...auto, Speaker_Made: score })}
              />
            </Grid>
            <Grid item>
              <ScoreCounter
                label="Speaker Missed"
                score={auto.Speaker_Missed}
                setScore={(score) =>
                  setAuto({ ...auto, Speaker_Missed: score })
                }
              />
            </Grid>
            <Grid item>
              <ScoreCounter
                label="Amp Made"
                score={auto.Amp_Made}
                setScore={(score) => setAuto({ ...auto, Amp_Made: score })}
              />
            </Grid>
            <Grid item>
              <ScoreCounter
                label="Amp Missed"
                score={auto.Amp_Missed}
                setScore={(score) => setAuto({ ...auto, Amp_Missed: score })}
              />
            </Grid>
          </Grid>
          <CustomCheckbox
            lable="Taxi"
            color={settings.Alliance === "Red" ? "#DC2626" : "#2563EB"}
            value={auto.Taxi}
            onChange={(event) =>
              setAuto({
                ...auto,
                Taxi: event.target.checked,
              })
            }
          />
        </div>
      </div>

      <div className="flex flex-row items-center justify-center"></div>
    </div>
  );
}
