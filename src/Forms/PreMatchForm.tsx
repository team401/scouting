import Chooser from "../Components/Chooser";
import { MouseEvent } from "react";
import AllianceSwitch from "../Components/AllianceSwitch";
import {
  useSettingsContext,
  usePreMatchContext,
  Boolean,
} from "../ContextProvider";
import React from "react";
import { Link } from "react-router-dom";
import { GetTeamsEvent } from "../Data";
import TeamSelector from "../Components/TeamSelector";
import { CheckBox } from "@mui/icons-material";
import { Unstable_NumberInput as NumberInput } from "@mui/base/Unstable_NumberInput";
import {
  Box,
  Checkbox,
  FilledTextFieldProps,
  FormControlLabel,
  Grid,
  Input,
  OutlinedTextFieldProps,
  StandardTextFieldProps,
  TextField,
  TextFieldVariants,
} from "@mui/material";
import CustomCheckbox from "../Components/CustomCheckbox";

export default function PreMatchForm() {
  const { settings, setSettings } = useSettingsContext();
  const { preMatch, setPreMatch } = usePreMatchContext();
  return (
    <div className="flex flex-col space-y-4 items-center content-center">
      <Grid
        container
        spacing={2}
        direction={"column"}
        flexGrow={12}
        justifyContent={"center"}
        alignItems={"center"}
        paddingRight={2}
      >
        <Grid item>
          <div className="font-semibold text-4xl text-center">PreMatch</div>
        </Grid>
        <Grid item>
          <TeamSelector
            options={settings.FrcTeams}
            value={preMatch.Team}
            onInputChange={(event, value, reason) => {
              if (settings.FrcTeams.includes(value)) {
                setPreMatch({ ...preMatch, Team: value });
                console.log("input change called:", preMatch.Team);
              }
            }}
            onChange={undefined}
          />
        </Grid>
        <Grid item>
          <div className="text-start">Match</div>
          <NumberInput
            className="block p-2.5 w-full text-sm text-black bg-transparent placeholder-black rounded-lg border border-black"
            aria-label="Demo number input"
            placeholder="Match number..."
            value={preMatch.Match}
            onChange={(event, value) =>
              setPreMatch({ ...preMatch, Match: value })
            }
          ></NumberInput>
        </Grid>
        <Grid item gridRow={1} justifyItems={"center"}>
          <CustomCheckbox
            label="NoShow"
            color={settings.Alliance === "Red" ? "#DC2626" : "#2563EB"}
            value={preMatch.NoShow}
            onChange={(event) =>
              setPreMatch({
                ...preMatch,
                NoShow: event.target.checked,
              })
            }
          />
          <CustomCheckbox
            label="Playoffs"
            color={settings.Alliance === "Red" ? "#DC2626" : "#2563EB"}
            value={preMatch.Playoffs}
            onChange={(event) =>
              setPreMatch({
                ...preMatch,
                Playoffs: event.target.checked,
              })
            }
          />
        </Grid>
      </Grid>
    </div>
  );
}
