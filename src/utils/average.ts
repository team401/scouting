import {Auto, PreMatch, Settings, Teleop} from "../ContextProvider";
import supabase from "../Supabase/supabaseClient";
import findClimbPoints from "./findPoints";
import {AverageData} from "../types";

const average = (oldAvg: number, newVal: number, denom: number) => {
    return ((oldAvg * (denom - 1) + newVal) / denom).toFixed(2);
}

const updateAverage = async (settings: Settings, preMatch: PreMatch, auto: Auto, teleop: Teleop) => {
// compute and send averages
    const { data, error: avgError } = await supabase.from("Averages").select(
            "teamNumber, matchesPlayed, teleAmp, teleSpeaker, autoAmp, autoSpeaker, climb, trapPercent, taxiPercent, autoAmpAccuracy, teleAmpAccuracy"
        ).eq(
            "teamNumber", parseInt(preMatch.Team)
        ).eq(
            "event", settings.Competition
        );
    const resp = await data;
    if (avgError) {
        console.error(avgError.message);
    } else if (resp == null || resp.length == 0 || resp == undefined) {
        // create column ( first match added )
        let climbPoints = 0;
        if(teleop.EndGame === "Parked") {
            climbPoints = 1;
        } else if (teleop.EndGame === "Climbed") {
            climbPoints = 3;
        } else if (teleop.EndGame === "Harmony") {
            climbPoints = 5;
        }
        const {error: insertError } = await supabase.from("Averages").insert({
            teamNumber: parseInt(preMatch.Team),
            event: settings.Competition,
            matchesPlayed: 1,
            teleAmp: teleop.Amp_Made,
            teleSpeaker: teleop.Speaker_Made,
            autoAmp: auto.Amp_Made,
            autoSpeaker: auto.Speaker_Made,
            climb: climbPoints,
            trapPercent: teleop.Trap === "Successful" ? 100 : 0,
            taxiPercent: auto.Taxi ? 100 : 0,
            autoAmpAccuracy: auto.Amp_Made/(auto.Amp_Made+auto.Amp_Missed) * 100,
            teleAmpAccuracy: teleop.Amp_Made/(teleop.Amp_Made+teleop.Amp_Missed) * 100,
        })
        if(insertError) {
            console.error(insertError.message);
        }
    } else {
        const oldVals = resp[0];
        const totalMatches = oldVals.matchesPlayed + 1;
        const {error: updateError } = await supabase.from("Average").update({
            matchesPlayed: totalMatches,
            teleAmp: average(oldVals.teleAmp, teleop.Amp_Made, totalMatches),
            teleSpeaker: average(oldVals.teleSpeaker, teleop.Speaker_Made, totalMatches),
            autoAmp: average(oldVals.autoAmp, auto.Amp_Made, totalMatches),
            autoSpeaker: average(oldVals.autoSpeaker, auto.Speaker_Made, totalMatches),
            climb: average(oldVals.climb, findClimbPoints(teleop.EndGame), totalMatches),
            trapPercent: average(oldVals.trapPercent, teleop.Trap === "Successful" ? 100 : 0, totalMatches),
            taxiPercent: average(oldVals.taxiPercent, auto.Taxi ? 100 : 0, totalMatches),
            autoAmpAccuracy: average(oldVals.autoAmpAccuracy, (auto.Amp_Made/(auto.Amp_Made+auto.Amp_Missed) *  100), totalMatches),
            teleopAmpAccuracy: average(oldVals.teleAmpAccuracy, (teleop.Amp_Made/(teleop.Amp_Made+teleop.Amp_Missed) * 100), totalMatches)
        })
        if (updateError) {
            console.error(updateError.message);
        }
    }
}

export async function getAverageData(competition: string): Promise<AverageData[] | null> {
    try {
        const {data, error } = await supabase
            .from("Averages")
            .select(
                "teamNumber, matchesPlayed, teleAmp, teleSpeaker, autoAmp, autoSpeaker, climb, trapPercent, taxiPercent, autoAmpAccuracy, teleAmpAccuracy"
            )
            .eq("event", competition);

        if(data && data.length !== 0) {
            console.log(data);
            return data as AverageData[];
        }
        if(error) {
            console.error(error);
        }
        return null;
    } catch (err: any) {
        console.error('Error grabbbing average:', err.message);
        return null;
    }
}
export default updateAverage;
