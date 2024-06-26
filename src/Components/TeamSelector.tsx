import {
  Autocomplete,
  AutocompleteRenderInputParams,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import React, { SyntheticEvent } from "react";
import { GetTeamsEvent } from "../Data";
import { usePreMatchContext, useSettingsContext } from "../ContextProvider";
import axios, { isCancel, AxiosError } from "axios";

type selectprops = {
  options: String[];
  value: String;
  onChange:
    | ((
        event: SyntheticEvent<Element, Event>,
        value: string | String | null
      ) => void)
    | undefined;
  onInputChange:
    | ((
        event: React.SyntheticEvent<Element, Event>,
        value: string,
        reason: string
      ) => void)
    | undefined;
};

export default function TeamSelector(props: selectprops) {
  const { settings, setSettings } = useSettingsContext();
  const { preMatch, setPreMatch } = usePreMatchContext();

  return (
    <Autocomplete
      freeSolo
      clearOnEscape
      options={props.options}
      value={props.value}
      autoComplete
      onInputChange={props.onInputChange}
      onChange={props.onChange}
      autoSelect={true}
      autoHighlight
      sx={{ width: 100 }}
      renderInput={(params) => <TextField {...params} label="Team" />}
      onOpen={(event) => {
        GetTeamsEvent(settings.Competition).then((value) => {
          setSettings({
            ...settings,
            FrcTeams: value,
          });
        });
      }}
    />
  );
}
// export default function TeamSelector() {
//   const [teams, setTeams] = React.useState([]);
//   const [loading, setLoading] = React.useState(false);
//   const { preMatch, setPreMatch } = usePreMatchContext();
//   const getTeamList = () => {
//     setLoading(true);
//     axios
//       .get(
//         "https://www.thebluealliance.com/api/v3/event/2024mdowi/teams/simple",
//         {
//           method: "GET",
//           headers: {
//             "X-TBA-Auth-Key":
//               "3MbBFKbSOrahWa5SA7GmFv6L9ByIly1nk0vUPPSK1xQnI4ccLvsF5FRknNFz1CAm",
//           },
//         }
//       )
//       .then((res) => {
//         // schoolList =  JSON.stringify(res.data.msg)
//         const namesArr = res.data.msg.map(
//           (user: { team_number: any }) => user.team_number
//         );
//         setTeams(namesArr);
//         // return res.data.msg.map(user => user.school_name);
//       })
//       .catch((error) => {
//         console.log("ERROR");
//         console.log(error);
//       })
//       .finally(() => setLoading(false));
//   };

//   return (
//     <Autocomplete
//       options={teams}
//       onOpen={() => getTeamList()}
//       loading={loading}
//       value={preMatch.Team}
//       onChange={(event) =>
//         setPreMatch({
//           ...preMatch,
//           Team: event.currentTarget.textContent!,
//         })
//       }
//       sx={{ width: 300 }}
//       renderInput={(params) => <TextField {...params} label="Team" />}
//     />
//   );
// }
