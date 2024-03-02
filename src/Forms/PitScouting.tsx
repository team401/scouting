import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GetTeamsDistrict, GetTeamsEvent } from "../Data";
import TeamSelector from "../Components/TeamSelector";
import { CheckBox, Settings } from "@mui/icons-material";
import { Unstable_NumberInput as NumberInput } from "@mui/base/Unstable_NumberInput";
import {
  Box,
  Checkbox,
  FilledTextFieldProps,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  InputLabel,
  MenuItem,
  OutlinedTextFieldProps,
  Select,
  StandardTextFieldProps,
  TextField,
  TextFieldVariants,
} from "@mui/material";
import CustomCheckbox from "../Components/CustomCheckbox";
import { usePitScoutContext, useSettingsContext } from "../ContextProvider";
import CompetitionSelector from "../Components/CompetitionSelector";
import supabase from "../Supabase/supabaseClient";
import MultiAutoComplete from "../Components/MultiAutoComplete";

export default function PitScout() {
  const { pitScout, setPitScout } = usePitScoutContext();
  const [images, setImages] = React.useState([]);
  const [formError, setFormError] = useState("");
  const { settings, setSettings } = useSettingsContext();
  const fileInput = document.getElementById("image-input");
  useEffect(() => {
    getTeamsListDristrict();
  }, [pitScout.Competition]);
  const getTeamsListDristrict = async () => {
    const teams = await GetTeamsDistrict();
    setPitScout({ ...pitScout, TeamsList: teams });
    return teams;
  };
  const handleOnSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (
      pitScout.Team == "" ||
      pitScout.Competition == undefined ||
      pitScout.Competition == ""
    ) {
      setFormError("Please fill out form correctly");
      return;
    }
    const { error } = await supabase.from("Pit_Data").insert({
      Competition: pitScout.Competition,
      Team: pitScout.Team,
      Drive: pitScout.Drive,
      Nomination: pitScout.Nomination,
      Amp: pitScout.Amp,
      Speaker: pitScout.Speaker,
      Climb: pitScout.Climb,
      Trap: pitScout.Trap,
      Comments: pitScout.Comments,
    });
    if (error) {
      console.log(error);
      setFormError(
        `Error: ${error.message} (please try again with a better connection)`
      );
    }
    setPitScout({
      ...pitScout,
      Nomination: ["N/A"],
      Amp: false,
      Speaker: false,
      Climb: false,
      Trap: false,
      Comments: "",
    });
    setFormError("");
  };
  // const handleFileSubmit = async (images: FileList) => {
  //   let file = images[0];
  //    fileInput!.src = URL.createObjectURL(file);
  // };
  return (
    <div className="w-11/12 h-full md:h-min md:w-min">
      <form onSubmit={handleOnSubmit}>
        <div className="flex flex-col space-y-4 items-center content-center">
          <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-full h-full">
            <div className="font-semibold text-4xl text-center py-2">
              PitScouting
            </div>
            <Grid
              container
              spacing={2}
              direction={"column"}
              flexGrow={12}
              justifyContent={"center"}
              alignItems={"center"}
              paddingRight={2}
              paddingTop={4}
            >
              <Grid item>
                <CompetitionSelector
                  value={pitScout.Competition}
                  onChange={(event, newValue: string | null) =>
                    setPitScout({
                      ...pitScout,
                      Competition: newValue!,
                    })
                  }
                />
              </Grid>
              <Grid item>
                <div className=" flex flex-row sm:flex-col gap-4 space-x-4 justify-between columns-lg">
                  <div className=" col-span-1 px-2">
                    <TeamSelector
                      value={pitScout.Team}
                      options={pitScout.TeamsList}
                      onChange={(event, newValue) => {
                        setPitScout({ ...pitScout, Team: newValue! as string });
                      }}
                    />
                  </div>
                  <div className=" col-span-1 px-2">
                    <FormControl>
                      <InputLabel id="demo-simple-select-label">
                        Drive
                      </InputLabel>
                      <Select
                        labelId="demo-simple-select-label"
                        id="demo-simple-select"
                        value={pitScout.Drive}
                        label="Age"
                        onChange={(event, newValue) =>
                          setPitScout({
                            ...pitScout,
                            Drive: event.target.value,
                          })
                        }
                      >
                        <MenuItem value={"Tank"}>Tank</MenuItem>
                        <MenuItem value={"Swerve"}>Swerve</MenuItem>
                        <MenuItem value={"Mechanum"}>Mechanum</MenuItem>
                      </Select>
                    </FormControl>
                  </div>
                </div>
              </Grid>
              <Grid item>
                <MultiAutoComplete />
              </Grid>
              <Grid item>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <CustomCheckbox
                        value={pitScout.Amp}
                        onChange={(event) =>
                          setPitScout({
                            ...pitScout,
                            Amp: event.target.checked,
                          })
                        }
                        color={
                          settings.Alliance === "Red" ? "#DC2626" : "#2563EB"
                        }
                        label={"Amp"}
                      />
                    }
                    label={""}
                  />
                  <FormControlLabel
                    control={
                      <CustomCheckbox
                        value={pitScout.Speaker}
                        onChange={(event) =>
                          setPitScout({
                            ...pitScout,
                            Speaker: event.target.checked,
                          })
                        }
                        color={
                          settings.Alliance === "Red" ? "#DC2626" : "#2563EB"
                        }
                        label={"Speaker"}
                      />
                    }
                    label={""}
                  />
                  <FormControlLabel
                    control={
                      <CustomCheckbox
                        value={pitScout.Climb}
                        onChange={(event) =>
                          setPitScout({
                            ...pitScout,
                            Climb: event.target.checked,
                          })
                        }
                        color={
                          settings.Alliance === "Red" ? "#DC2626" : "#2563EB"
                        }
                        label={"Climb"}
                      />
                    }
                    label={""}
                  />
                  <FormControlLabel
                    control={
                      <CustomCheckbox
                        value={pitScout.Trap}
                        onChange={(event) =>
                          setPitScout({
                            ...pitScout,
                            Trap: event.target.checked,
                          })
                        }
                        color={
                          settings.Alliance === "Red" ? "#DC2626" : "#2563EB"
                        }
                        label={"Trap"}
                      />
                    }
                    label={""}
                  />
                </FormGroup>
              </Grid>
              <Grid item>
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
                    value={pitScout.Comments}
                    onChange={(event) =>
                      setPitScout({
                        ...pitScout,
                        Comments: event.currentTarget.value,
                      })
                    }
                    className="block p-2.5 w-full text-sm text-black bg-transparent placeholder-black rounded-lg border border-black"
                    placeholder="Write your thoughts here..."
                  ></textarea>
                </div>
              </Grid>
              {/* <Grid item>
                <div className="flex flex-col gap-4 space-y-4 justify-center content-center items-center">
                  <div className=" col-span-1 py-2">
                    <label> Robot Picture</label>
                  </div>
                  <div className=" col-span-1 py-2 justify-center items-center content-center">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      id="image-input"
                      onChange={(e) => handleFileSubmit(e.target.value)}
                    />
                  </div>
                </div>
              </Grid> */}
            </Grid>
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
      <br></br>
      <br></br>
      <br></br>
    </div>
  );
}
