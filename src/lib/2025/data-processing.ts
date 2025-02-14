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
                total_auto_points: 0,
                total_teleop_points: 0,
                total_points: 0,
                // Likert scale data.
                total_climb_speed: 0,
                total_driving: 0,
                total_defense: 0,
                total_stability: 0,

                match_data: {}
            }
        }

        // Match score processing.
        const coralAutoL4Count = Number(data[i]["auto.coral.l4.scored"]);
        const coralAutoL3Count = Number(data[i]["auto.coral.l3.scored"]);
        const coralAutoL2Count = Number(data[i]["auto.coral.l2.scored"]);
        const coralAutoL1Count = Number(data[i]["auto.coral.l1.scored"]);
        const coralAutoL4Points = coralL4AutoValue * coralAutoL4Count;
        const coralAutoL3Points = coralL3AutoValue * coralAutoL3Count;
        const coralAutoL2Points = coralL2AutoValue * coralAutoL2Count;
        const coralAutoL1Points = coralL1AutoValue * coralAutoL1Count;

        const coralTeleopL4Count = Number(data[i]["teleop.coral.l4.scored"]);
        const coralTeleopL3Count = Number(data[i]["teleop.coral.l3.scored"]);
        const coralTeleopL2Count = Number(data[i]["teleop.coral.l2.scored"]);
        const coralTeleopL1Count = Number(data[i]["teleop.coral.l1.scored"]);
        const coralTeleopL4Points = coralL4TeleopValue * coralTeleopL4Count;
        const coralTeleopL3Points = coralL3TeleopValue * coralTeleopL3Count;
        const coralTeleopL2Points = coralL2TeleopValue * coralTeleopL2Count;
        const coralTeleopL1Points = coralL1TeleopValue * coralTeleopL1Count;


        const coralAutoPoints = coralAutoL4Points + coralAutoL3Points + coralAutoL2Points
            + coralAutoL1Points;
        const algaeAutoPoints = (algaeNetValue * Number(data[i]["auto.algae.net.success"]))
            + (algaeProcessorValue * Number(data[i]["auto.algae.processor.success"]));
        const moveAutoPoints = data[i]["auto.moved"] ? autoMovePoints : 0;
        const autoPoints = moveAutoPoints + coralAutoPoints + algaeAutoPoints;

        const coralTeleopPoints = coralTeleopL4Points + coralTeleopL3Points + coralTeleopL2Points
            + coralTeleopL1Points;
        const algaeTeleopPoints = (algaeNetValue * Number(data[i]["teleop.algae.net.success"]))
            + (algaeProcessorValue * Number(data[i]["teleop.algae.processor.success"]));
        const teleopPoints = coralTeleopPoints + algaeTeleopPoints;

        eventData[teamNumber].num_matches++;

        // Auto
        eventData[teamNumber].total_auto_move_count += moveAutoPoints;
        eventData[teamNumber].total_auto_coral_L1_count += coralAutoL1Count;
        eventData[teamNumber].total_auto_coral_L2_count += coralAutoL2Count;
        eventData[teamNumber].total_auto_coral_L3_count += coralAutoL3Count;
        eventData[teamNumber].total_auto_coral_L4_count += coralAutoL4Count;
        eventData[teamNumber].total_auto_coral_points += coralAutoPoints;
        eventData[teamNumber].total_auto_algae_net_count += Number(data[i]["auto.algae.net.success"]);
        eventData[teamNumber].total_auto_algae_processor_count += Number(data[i]["auto.algae.processor.success"]);
        eventData[teamNumber].total_auto_algae_points += algaeAutoPoints;

        // Teleop
        eventData[teamNumber].total_teleop_coral_L1_count += coralTeleopL1Count;
        eventData[teamNumber].total_teleop_coral_L2_count += coralTeleopL2Count;
        eventData[teamNumber].total_teleop_coral_L3_count += coralTeleopL3Count;
        eventData[teamNumber].total_teleop_coral_L4_count += coralTeleopL4Count;
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

        // Likert scale data.
        const climbSpeed = Number(data[i]["endgame.climb_speed"]);
        const drivingScore = Number(data[i]["postmatch.driving"]);
        const defenseScore = Number(data[i]["postmatch.defense"]);
        const stabilityScore = Number(data[i]["postmatch.stability"]);
        eventData[teamNumber].total_climb_speed += climbSpeed;
        eventData[teamNumber].total_driving += drivingScore;
        eventData[teamNumber].total_defense += defenseScore;
        eventData[teamNumber].total_stability += stabilityScore;

        const matchPoints = autoPoints + teleopPoints + bargePoints;

        // Total
        eventData[teamNumber].total_coral_points += coralAutoPoints + coralTeleopPoints;
        eventData[teamNumber].total_algae_points += algaeAutoPoints + algaeTeleopPoints;
        eventData[teamNumber].total_barge_points += bargePoints;
        eventData[teamNumber].total_auto_points += autoPoints;
        eventData[teamNumber].total_teleop_points += teleopPoints;
        eventData[teamNumber].total_points += matchPoints;

        const matchData = {
            coralAutoL1Count: coralAutoL1Count,
            coralAutoL2Count: coralAutoL2Count,
            coralAutoL3Count: coralAutoL3Count,
            coralAutoL4Count: coralAutoL4Count,
            coralAutoL1Points: coralAutoL1Points,
            coralAutoL2Points: coralAutoL2Points,
            coralAutoL3Points: coralAutoL3Points,
            coralAutoL4Points: coralAutoL4Points,
            coralAutoPoints: coralAutoPoints,
            algaeAutoPoints: algaeAutoPoints,
            moveAutoPoints: moveAutoPoints,
            autoPoints: autoPoints,
            coralTeleopL1Count: coralTeleopL1Count,
            coralTeleopL2Count: coralTeleopL2Count,
            coralTeleopL3Count: coralTeleopL3Count,
            coralTeleopL4Count: coralTeleopL4Count,
            coralTeleopL1Points: coralTeleopL1Points,
            coralTeleopL2Points: coralTeleopL2Points,
            coralTeleopL3Points: coralTeleopL3Points,
            coralTeleopL4Points: coralTeleopL4Points,
            coralTeleopPoints: coralTeleopPoints,
            algaeTeleopPoints: algaeTeleopPoints,
            teleopPoints: teleopPoints,
            bargePoints: bargePoints,
            matchPoints: matchPoints,
            climbSpeed: climbSpeed,
            drivingScore: drivingScore,
            defenseScore: defenseScore,
            stabilityScore: stabilityScore
        }

        // Load the match stats into the matches array for this team.
        const matchNumber = String(data[i]["prematch.match_number"]);
        eventData[teamNumber].match_data[matchNumber] = matchData;
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
        eventData[teamNumber].avg_algae_points = 0;

        eventData[teamNumber].avg_auto_points = 0;
        eventData[teamNumber].avg_teleop_points = 0;
        eventData[teamNumber].avg_points = 0;

        eventData[teamNumber].avg_climb_speed = 0;
        eventData[teamNumber].avg_driving = 0;
        eventData[teamNumber].avg_defense = 0;
        eventData[teamNumber].avg_stability = 0;

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

            eventData[teamNumber].avg_auto_points = eventData[teamNumber].total_auto_points / num_matches;
            eventData[teamNumber].avg_teleop_points = eventData[teamNumber].total_teleop_points / num_matches;
            eventData[teamNumber].avg_points = eventData[teamNumber].total_points / num_matches;

            eventData[teamNumber].avg_climb_speed = eventData[teamNumber].total_climb_speed / num_matches;
            eventData[teamNumber].avg_driving = eventData[teamNumber].total_driving / num_matches;
            eventData[teamNumber].avg_defense = eventData[teamNumber].total_defense / num_matches;
            eventData[teamNumber].avg_stability = eventData[teamNumber].total_stability / num_matches;
        }
    }

    return eventData;
}
