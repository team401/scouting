import {DataViz} from "../ContextProvider";

export const getNickName = async (meat: string, dataViz: DataViz, setDataViz: any) => {
    let response;
    if (dataViz.AllComps) {
        response = await fetch(
            "https://www.thebluealliance.com/api/v3/district/2024chs/teams/simple",
            {
                method: "GET",
                headers: {
                    "X-TBA-Auth-Key":
                        "3MbBFKbSOrahWa5SA7GmFv6L9ByIly1nk0vUPPSK1xQnI4ccLvsF5FRknNFz1CAm",
                },
            }
        );
    } else {
        if (meat == "" || meat.length == 0) {
            return setDataViz({ ...dataViz, NickName: "Error" });
        }
        response = await fetch(
            "https://www.thebluealliance.com/api/v3/team/frc" + meat + "/simple",
            {
                method: "GET",
                headers: {
                    "X-TBA-Auth-Key":
                        "3MbBFKbSOrahWa5SA7GmFv6L9ByIly1nk0vUPPSK1xQnI4ccLvsF5FRknNFz1CAm",
                },
            }
        );
    }
    if (!response.ok) {
        const message = `An error has occured: ${response.status}`;
        throw new Error(message);
    }
    const resp = await response.json();
    if (resp.legnth == 0 || resp == undefined || resp == null) {
        return "Error";
    }
    const NickName = resp.nickname;
    console.log("NickName", NickName);
    return NickName;
};
