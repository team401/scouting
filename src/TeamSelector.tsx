import {
  Autocomplete,
  AutocompleteRenderInputParams,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";
import { GetTeams } from "./Data";
import { usePreMatchContext, useSettingsContext } from "./ContextProvider";
import axios, { isCancel, AxiosError } from "axios";

export default function TeamSelector() {
  const { settings, setSettings } = useSettingsContext();
  const { preMatch, setPreMatch } = usePreMatchContext();

  return (
    <Autocomplete
      freeSolo
      clearOnEscape
      options={settings.FrcTeams}
      value={preMatch.Team}
      onChange={(event) =>
        setPreMatch({
          ...preMatch,
          Team: event.currentTarget.textContent!,
        })
      }
      sx={{ width: 300 }}
      renderInput={(params) => <TextField {...params} label="Team" />}
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
