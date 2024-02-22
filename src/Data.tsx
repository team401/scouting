import { Settings, useSettingsContext } from "./ContextProvider";
import { DataViz, useDataVizContext } from "./ContextProvider";

type teamsList = String[];
const teamsCache: { [key: string]: teamsList } = {};
export async function GetTeamsEvent(competition: string): Promise<teamsList> {
  if (!teamsCache[competition]) {
    const response = await fetch(
      "https://www.thebluealliance.com/api/v3/event/" +
        competition +
        "/teams/simple",
      {
        method: "GET",
        headers: {
          "X-TBA-Auth-Key":
            "3MbBFKbSOrahWa5SA7GmFv6L9ByIly1nk0vUPPSK1xQnI4ccLvsF5FRknNFz1CAm",
        },
      }
    );
    if (!response.ok) {
      const message = `An error has occured: ${response.status}`;
      throw new Error(message);
    }
    const resp = await response.json();
    const mapped = resp.map((a: { team_number: any }) =>
      a.team_number.toString()
    );
    console.log("mapped teams list", mapped);
    teamsCache[competition] = mapped;
  }
  return teamsCache[competition];
}

export async function GetTeamsDistrict(): Promise<teamsList> {
  const response = await fetch(
    "https://www.thebluealliance.com/api/v3/district/2024chs/teams/simple",
    {
      method: "GET",
      headers: {
        "X-TBA-Auth-Key":
          "3MbBFKbSOrahWa5SA7GmFv6L9ByIly1nk0vUPPSK1xQnI4ccLvsF5FRknNFz1CAm",
      },
    }
  );
  if (!response.ok) {
    const message = `An error has occured: ${response.status}`;
    throw new Error(message);
  }
  const resp = await response.json();
  const mapped = resp.map((a: { team_number: any }) =>
    a.team_number.toString()
  );
  console.log("mapped teams list", mapped);
  teamsCache["2024chs"] = mapped;
  console.log("teamsCache", teamsCache);
  return teamsCache["2024chs"];
}
