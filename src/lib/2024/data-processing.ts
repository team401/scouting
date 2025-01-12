// TODO: fix types
// @ts-nocheck

import { supabase } from '@/lib/supabase-client';
import { dataVizTable } from '@/lib/constants';


export async function aggregateEventData(eventId: String): Promise<{}> {
    // Pull the relevant data from supabase.
    const { data, error } = await supabase.from(dataVizTable).select().eq('Event', eventId);

    // If there is an error, report it and do not load the data.
    if (error) {
        console.log(error);
        return [];
    }

    // Keep track of key team statistics in a dictionary.
    let eventData = {};

    // Aggregate the data.
    for (let i = 0; i < data.length; i++) {
        const teamNumber = String(data[i].team);

        // If the team doesn't exist yet, create it.
        const isExistingTeam = Object.keys(eventData).includes(teamNumber);
        if (!isExistingTeam) {
            // Initialize team data.
            eventData[teamNumber] = {
                // Set the team number so a table can be constructed directly from the data.
                team_number: teamNumber,
                num_matches: 0,
                total_auto_amp: 0,
                total_teleop_amp: 0,
                total_teleop_speaker: 0,
                match_data: {}
            }
        }

        eventData[teamNumber].num_matches++;
        eventData[teamNumber].total_auto_amp += data[i].Auto_Amp_Made;
        eventData[teamNumber].total_teleop_amp += data[i].Teleop_Amp_Made;
        eventData[teamNumber].total_teleop_speaker += data[i].Teleop_Speaker_Made;

        // Load the match stats into the matches array for this team.
        // event
        const matchNumber = String(data[i].Match);
        eventData[teamNumber].match_data[matchNumber] = data[i];
    }

    // Compute averages.
    const teamKeys = Object.keys(eventData);
    for (let i = 0; i < teamKeys.length; i++) {
        const teamNumber = teamKeys[i];
        const num_matches = eventData[teamNumber].num_matches;

        // Set defaults in case averages cannot be computed.
        eventData[teamNumber].avg_auto_amp = 0;
        eventData[teamNumber].avg_teleop_amp = 0;
        eventData[teamNumber].avg_teleop_speaker = 0;

        if (num_matches > 0) {
            eventData[teamNumber].avg_auto_amp = eventData[teamNumber].total_auto_amp / num_matches;
            eventData[teamNumber].avg_teleop_amp = eventData[teamNumber].total_teleop_amp / num_matches;
            eventData[teamNumber].avg_teleop_speaker = eventData[teamNumber].total_teleop_speaker / num_matches;
        }
    }

    return eventData;
}
