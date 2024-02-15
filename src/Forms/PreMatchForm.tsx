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
import { GetTeams } from "../Data";
import TeamSelector from "../Components/TeamSelector";
import { CheckBox } from "@mui/icons-material";
import { Unstable_NumberInput as NumberInput } from "@mui/base/Unstable_NumberInput";
import {
  Box,
  Checkbox,
  FilledTextFieldProps,
  FormControlLabel,
  Grid,
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
      >
        <Grid item>
          <div className="font-semibold text-4xl text-center">PreMatch</div>
        </Grid>
        <Grid item>
          <TeamSelector />
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
        <Grid item>
          <CustomCheckbox
            lable="NoShow"
            color={settings.Alliance === "Red" ? "#DC2626" : "#2563EB"}
            value={preMatch.NoShow}
            onChange={(event) =>
              setPreMatch({
                ...preMatch,
                NoShow: event.target.checked,
              })
            }
          />
        </Grid>
      </Grid>
    </div>
  );
}
