// TODO: fix types
// @ts-nocheck

import { supabase } from '@/lib/supabase-client';

const autoMovePoints = 2;

const coralL1AutoValue = 3;
const coralL2AutoValue = 4;
const coralL3AutoValue = 6;
const coralL4AutoValue = 7;

const coralL1TeleopValue = 2;
const coralL2TeleopValue = 3;
const coralL3TeleopValue = 4;
const coralL4TeleopValue = 5;

const algaeNetValue = 4;
const algaeProcessorValue = 6;

const parkPoints = 2;
const shallowCagePoints = 6;
const deepCagePoints = 12;


export async function aggregateEventData(eventTable: String, eventId: String): Promise<{}> {
    // Pull the relevant data from supabase.
    const { data, error } = await supabase.from(eventTable).select().eq('event', eventId);

    // If there is an error, report it and do not load the data.
    if (error) {
        console.log(error);
        return [];
    }

    // Keep track of key team statistics in a dictionary.
    let eventData = {};

    // Aggregate the data.
    for (let i = 0; i < data.length; i++) {
        const teamNumber = String(data[i]["prematch.team_number"]);

        // If the team doesn't exist yet, create it.
        const isExistingTeam = Object.keys(eventData).includes(teamNumber);
        if (!isExistingTeam) {
            // Initialize team data.
            eventData[teamNumber] = {
                // Set the team number so a table can be constructed directly from the data.
                team_number: teamNumber,
                num_matches: 0,
                total_auto_move_count: 0,
                total_auto_coral_points: 0,
                total_auto_algae_points: 0,
                total_teleop_coral_points: 0,
                total_teleop_algae_points: 0,
                total_auto_coral_L1_count: 0,
                total_auto_coral_L2_count: 0,
                total_auto_coral_L3_count: 0,
                total_auto_coral_L4_count: 0,
                total_teleop_coral_L1_count: 0,
                total_teleop_coral_L2_count: 0,
                total_teleop_coral_L3_count: 0,
                total_teleop_coral_L4_count: 0,
                total_auto_algae_processor_count: 0,
                total_auto_algae_net_count: 0,
                total_teleop_algae_processor_count: 0,
                total_teleop_algae_net_count: 0,
                total_park_count: 0,
                total_shallow_cage_count: 0,
                total_deep_cage_count: 0,
                total_coral_points: 0,
                total_algae_points: 0,
                total_barge_points: 0,
                total_points: 0,

                match_data: {}
            }
        }

        // Score processing.
        const coralAutoPoints = (coralL4AutoValue * Number(data[i]["auto.coral.l4.scored"]))
            + (coralL3AutoValue * Number(data[i]["auto.coral.l3.scored"]))
            + (coralL2AutoValue * Number(data[i]["auto.coral.l2.scored"]))
            + (coralL1AutoValue * Number(data[i]["auto.coral.l1.scored"]));
        const algaeAutoPoints = (algaeNetValue * Number(data[i]["auto.algae.net.success"]))
            + (algaeProcessorValue * Number(data[i]["auto.algae.processor.success"]));
        const coralTeleopPoints = (coralL4TeleopValue * Number(data[i]["teleop.coral.l4.scored"]))
            + (coralL3TeleopValue * Number(data[i]["teleop.coral.l3.scored"]))
            + (coralL2TeleopValue * Number(data[i]["teleop.coral.l2.scored"]))
            + (coralL1TeleopValue * Number(data[i]["teleop.coral.l1.scored"]));
        const algaeTeleopPoints = (algaeNetValue * Number(data[i]["teleop.algae.net.success"]))
            + (algaeProcessorValue * Number(data[i]["teleop.algae.processor.success"]));

        eventData[teamNumber].num_matches++;

        // Auto
        eventData[teamNumber].total_auto_move_count += data[i]["auto.moved"] ? autoMovePoints : 0;
        eventData[teamNumber].total_auto_coral_L1_count += Number(data[i]["auto.coral.l1.scored"]);
        eventData[teamNumber].total_auto_coral_L2_count += Number(data[i]["auto.coral.l2.scored"]);
        eventData[teamNumber].total_auto_coral_L3_count += Number(data[i]["auto.coral.l3.scored"]);
        eventData[teamNumber].total_auto_coral_L4_count += Number(data[i]["auto.coral.l4.scored"]);
        eventData[teamNumber].total_auto_coral_points += coralAutoPoints;
        eventData[teamNumber].total_auto_algae_net_count += Number(data[i]["auto.algae.net.success"]);
        eventData[teamNumber].total_auto_algae_processor_count += Number(data[i]["auto.algae.processor.success"]);
        eventData[teamNumber].total_auto_algae_points += algaeAutoPoints;

        // Teleop
        eventData[teamNumber].total_teleop_coral_L1_count += Number(data[i]["teleop.coral.l1.scored"]);
        eventData[teamNumber].total_teleop_coral_L2_count += Number(data[i]["teleop.coral.l2.scored"]);
        eventData[teamNumber].total_teleop_coral_L3_count += Number(data[i]["teleop.coral.l3.scored"]);
        eventData[teamNumber].total_teleop_coral_L4_count += Number(data[i]["teleop.coral.l4.scored"]);
        eventData[teamNumber].total_teleop_coral_points += coralTeleopPoints;
        eventData[teamNumber].total_teleop_algae_net_count += Number(data[i]["teleop.algae.net.success"]);
        eventData[teamNumber].total_teleop_algae_processor_count += Number(data[i]["teleop.algae.processor.success"]);
        eventData[teamNumber].total_teleop_algae_points += algaeTeleopPoints;

        // Endgame
        const endgameStatus = data[i]["endgame.endgame"];
        let bargePoints = 0;
        if (endgameStatus == "deep") {
            eventData[teamNumber]["total_deep_cage_count"] += 1;
            bargePoints = deepCagePoints;
        } else if (endgameStatus == "shallow") {
            eventData[teamNumber]["total_shallow_cage_count"] += 1;
            bargePoints = shallowCagePoints;
        } else if (endgameStatus == "park" || endgameStatus == "deep_fail" || endgameStatus == "shallow_fail") {
            eventData[teamNumber]["total_park_count"] += 1;
            bargePoints = parkPoints;
        }

        // Total
        eventData[teamNumber].total_coral_points += coralAutoPoints + coralTeleopPoints;
        eventData[teamNumber].total_algae_points += algaeAutoPoints + algaeTeleopPoints;
        eventData[teamNumber].total_barge_points += bargePoints;
        eventData[teamNumber].total_points += coralAutoPoints + coralTeleopPoints + algaeAutoPoints + algaeTeleopPoints + bargePoints;

        // Load the match stats into the matches array for this team.
        const matchNumber = String(data[i]["prematch.match_number"]);
        eventData[teamNumber].match_data[matchNumber] = data[i];
    }

    // Compute averages.
    const teamKeys = Object.keys(eventData);
    for (let i = 0; i < teamKeys.length; i++) {
        const teamNumber = teamKeys[i];
        const num_matches = eventData[teamNumber].num_matches;

        // Set defaults in case averages cannot be computed.
        eventData[teamNumber].avg_auto_coral_L1_count = 0;
        eventData[teamNumber].avg_auto_coral_L2_count = 0;
        eventData[teamNumber].avg_auto_coral_L3_count = 0;
        eventData[teamNumber].avg_auto_coral_L4_count = 0;
        eventData[teamNumber].avg_auto_coral_points = 0;
        eventData[teamNumber].avg_auto_algae_net_count = 0;
        eventData[teamNumber].avg_auto_algae_processor_count = 0;
        eventData[teamNumber].avg_auto_algae_points = 0;

        eventData[teamNumber].avg_teleop_coral_L1_count = 0;
        eventData[teamNumber].avg_teleop_coral_L2_count = 0;
        eventData[teamNumber].avg_teleop_coral_L3_count = 0;
        eventData[teamNumber].avg_teleop_coral_L4_count = 0;
        eventData[teamNumber].avg_teleop_coral_points = 0;
        eventData[teamNumber].avg_teleop_algae_net_count = 0;
        eventData[teamNumber].avg_teleop_algae_processor_count = 0;
        eventData[teamNumber].avg_teleop_algae_points = 0;

        eventData[teamNumber].avg_park_count = 0;
        eventData[teamNumber].avg_shallow_cage_count = 0;
        eventData[teamNumber].avg_deep_cage_count = 0;
        eventData[teamNumber].avg_barge_points = 0;

        eventData[teamNumber].avg_coral_points = 0;
        eventData[teamNumber].avg_auto_algae_points = 0;
        eventData[teamNumber].avg_points = 0;

        if (num_matches > 0) {
            eventData[teamNumber].avg_auto_coral_L1_count = eventData[teamNumber].total_auto_coral_L1_count / num_matches;
            eventData[teamNumber].avg_auto_coral_L2_count = eventData[teamNumber].total_auto_coral_L2_count / num_matches;
            eventData[teamNumber].avg_auto_coral_L3_count = eventData[teamNumber].total_auto_coral_L3_count / num_matches;
            eventData[teamNumber].avg_auto_coral_L4_count = eventData[teamNumber].total_auto_coral_L4_count / num_matches;
            eventData[teamNumber].avg_auto_coral_points = eventData[teamNumber].total_auto_coral_points / num_matches;
            eventData[teamNumber].avg_auto_algae_net_count = eventData[teamNumber].total_auto_algae_net_count / num_matches;
            eventData[teamNumber].avg_auto_algae_processor_count = eventData[teamNumber].total_auto_algae_processor_count / num_matches;
            eventData[teamNumber].avg_auto_algae_points = eventData[teamNumber].total_auto_algae_points / num_matches;

            eventData[teamNumber].avg_teleop_coral_L1_count = eventData[teamNumber].total_teleop_coral_L1_count / num_matches;
            eventData[teamNumber].avg_teleop_coral_L2_count = eventData[teamNumber].total_teleop_coral_L2_count / num_matches;
            eventData[teamNumber].avg_teleop_coral_L3_count = eventData[teamNumber].total_teleop_coral_L3_count / num_matches;
            eventData[teamNumber].avg_teleop_coral_L4_count = eventData[teamNumber].total_teleop_coral_L4_count / num_matches;
            eventData[teamNumber].avg_teleop_coral_points = eventData[teamNumber].total_teleop_coral_points / num_matches;
            eventData[teamNumber].avg_teleop_algae_net_count = eventData[teamNumber].total_teleop_algae_net_count / num_matches;
            eventData[teamNumber].avg_teleop_algae_processor_count = eventData[teamNumber].total_teleop_algae_processor_count / num_matches;
            eventData[teamNumber].avg_teleop_algae_points = eventData[teamNumber].total_teleop_algae_points / num_matches;

            eventData[teamNumber].avg_park_count = eventData[teamNumber].total_park_count / num_matches;
            eventData[teamNumber].avg_shallow_cage_count = eventData[teamNumber].total_shallow_cage_count / num_matches;
            eventData[teamNumber].avg_deep_cage_count = eventData[teamNumber].total_deep_cage_count / num_matches;
            eventData[teamNumber].avg_barge_points = eventData[teamNumber].total_barge_points / num_matches;

            eventData[teamNumber].avg_coral_points = eventData[teamNumber].total_coral_points / num_matches;
            eventData[teamNumber].avg_algae_points = eventData[teamNumber].total_algae_points / num_matches;
            eventData[teamNumber].avg_points = eventData[teamNumber].total_points / num_matches;
        }
    }

    return eventData;
}
