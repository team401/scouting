import { supabase } from '@/lib/supabase-client';

export const dataEntryTable = "Scout_Data";
export const eventId = "2024vagi2";


export async function aggregateEventData(eventId: String): Promise<{}> {
    // Pull the relevant data from supabase.
    const { data, error } = await supabase.from(dataEntryTable).select().eq('Event', eventId);

    // If there is an error, report it and do not load the table.
    if (error) {
        console.log(error);
        return [];
    }

    // Keep track of key team statistics in a dictionary.
    let teamData = {};

    // Aggregate the data.
    for (let i = 0; i < data.length; i++) {
        const teamNumber = String(data[i].team);

        // If the team doesn't exist yet, create it.
        const isExistingTeam = Object.keys(teamData).includes(teamNumber);
        if (!isExistingTeam) {
            teamData[teamNumber] = {};

            // Initialize summations to 0.
            teamData[teamNumber].num_matches = 0;
            teamData[teamNumber].total_teleop_amp = 0;
            teamData[teamNumber].total_auto_amp = 0;
        }
        
        teamData[teamNumber].num_matches++;
        teamData[teamNumber].total_teleop_amp += data[i].Teleop_Amp_Made;
        teamData[teamNumber].total_auto_amp += data[i].Auto_Amp_Made;
    }

    // Compute averages.
    const teamKeys = Object.keys(teamData);
    for (let i = 0; i < teamKeys.length; i++) {
        const teamNumber = teamKeys[i];
        const num_matches = teamData[teamNumber].num_matches;

        if (num_matches > 0) {
            teamData[teamNumber].avg_teleop_amp = teamData[teamNumber].total_teleop_amp / num_matches;
        }
    }

    return teamData;
}