// TODO: fix types
// @ts-nocheck

import { supabase } from '@/lib/supabase-client';
import { mean, standardDeviation, min, max } from 'simple-statistics';

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

    // Parse all the match data into team specific data.
    eventData = parseMatchData(data, eventData);

    // Compute team statistics such as mean and standard deviation.
    eventData = computeTeamStatistics(eventData);

    return eventData;
}

function parseMatchData(rawData, eventData) {
    // Aggregate the data.
    for (let i = 0; i < rawData.length; i++) {
        const teamNumber = String(rawData[i]["prematch.team_number"]);

        // If the team doesn't exist yet, create it.
        const isExistingTeam = Object.keys(eventData).includes(teamNumber);
        if (!isExistingTeam) {
            // Initialize team data.
            eventData[teamNumber] = {
                // Set the team number so a table can be constructed directly from the data.
                team_number: teamNumber,
                num_matches: 0,
                total_auto_move_count: 0,
                total_park_count: 0,
                total_shallow_cage_count: 0,
                total_deep_cage_count: 0,

                match_data: {
                    matchNumber: [],
                    coralAutoL1Count: [],
                    coralAutoL2Count: [],
                    coralAutoL3Count: [],
                    coralAutoL4Count: [],
                    coralAutoL1Points: [],
                    coralAutoL2Points: [],
                    coralAutoL3Points: [],
                    coralAutoL4Points: [],
                    coralAutoPoints: [],
                    algaeAutoPoints: [],
                    moveAutoPoints: [],
                    autoPoints: [],
                    coralTeleopL1Count: [],
                    coralTeleopL2Count: [],
                    coralTeleopL3Count: [],
                    coralTeleopL4Count: [],
                    coralTeleopL1Points: [],
                    coralTeleopL2Points: [],
                    coralTeleopL3Points: [],
                    coralTeleopL4Points: [],
                    coralTeleopPoints: [],
                    algaeTeleopPoints: [],
                    teleopPoints: [],
                    bargePoints: [],
                    matchPoints: [],
                    coralPoints: [],
                    algaePoints: [],
                    climbSpeed: [],
                    drivingScore: [],
                    defenseScore: [],
                    stabilityScore: []
                }
            }
        }

        // Match score processing.
        const coralAutoL4Count = Number(rawData[i]["auto.coral.l4.scored"]);
        const coralAutoL3Count = Number(rawData[i]["auto.coral.l3.scored"]);
        const coralAutoL2Count = Number(rawData[i]["auto.coral.l2.scored"]);
        const coralAutoL1Count = Number(rawData[i]["auto.coral.l1.scored"]);
        const coralAutoL4Points = coralL4AutoValue * coralAutoL4Count;
        const coralAutoL3Points = coralL3AutoValue * coralAutoL3Count;
        const coralAutoL2Points = coralL2AutoValue * coralAutoL2Count;
        const coralAutoL1Points = coralL1AutoValue * coralAutoL1Count;

        const coralTeleopL4Count = Number(rawData[i]["teleop.coral.l4.scored"]);
        const coralTeleopL3Count = Number(rawData[i]["teleop.coral.l3.scored"]);
        const coralTeleopL2Count = Number(rawData[i]["teleop.coral.l2.scored"]);
        const coralTeleopL1Count = Number(rawData[i]["teleop.coral.l1.scored"]);
        const coralTeleopL4Points = coralL4TeleopValue * coralTeleopL4Count;
        const coralTeleopL3Points = coralL3TeleopValue * coralTeleopL3Count;
        const coralTeleopL2Points = coralL2TeleopValue * coralTeleopL2Count;
        const coralTeleopL1Points = coralL1TeleopValue * coralTeleopL1Count;


        const moveAutoPoints = Boolean(rawData[i]["auto.moved"]) ? autoMovePoints : 0;
        const coralAutoPoints = coralAutoL4Points + coralAutoL3Points + coralAutoL2Points
            + coralAutoL1Points;
        const algaeAutoPoints = (algaeNetValue * Number(rawData[i]["auto.algae.net.success"]))
            + (algaeProcessorValue * Number(rawData[i]["auto.algae.processor.success"]));
        const autoPoints = moveAutoPoints + coralAutoPoints + algaeAutoPoints;

        const coralTeleopPoints = coralTeleopL4Points + coralTeleopL3Points + coralTeleopL2Points
            + coralTeleopL1Points;
        const algaeTeleopPoints = (algaeNetValue * Number(rawData[i]["teleop.algae.net.success"]))
            + (algaeProcessorValue * Number(rawData[i]["teleop.algae.processor.success"]));
        const teleopPoints = coralTeleopPoints + algaeTeleopPoints;

        const coralPoints = coralAutoPoints + coralTeleopPoints;
        const algaePoints = algaeAutoPoints + algaeTeleopPoints;

        eventData[teamNumber].num_matches++;

        // Things that only count once per match.
        const endgameStatus = rawData[i]["endgame.endgame"];
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
        eventData[teamNumber]["total_auto_move_count"] += Boolean(rawData[i]["auto.moved"]) ? 1 : 0;

        // Likert scale data.
        const climbSpeed = Number(rawData[i]["endgame.climb_speed"]);
        const drivingScore = Number(rawData[i]["postmatch.driving"]);
        const defenseScore = Number(rawData[i]["postmatch.defense"]);
        const stabilityScore = Number(rawData[i]["postmatch.stability"]);

        // Total points.
        const matchPoints = autoPoints + teleopPoints + bargePoints;

        // Aggregate all match data.
        const matchNumber = String(rawData[i]["prematch.match_number"]);
        const matchData = {
            matchNumber: matchNumber,
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
            coralPoints: coralPoints,
            algaePoints: algaePoints,
            climbSpeed: climbSpeed,
            drivingScore: drivingScore,
            defenseScore: defenseScore,
            stabilityScore: stabilityScore
        }

        // Load the match stats into the matches array for this team.
        Object.keys(matchData).forEach((k, idx) => {
            eventData[teamNumber].match_data[k].push(matchData[k]);
        });
    }

    return eventData;
}

function computeTeamStatistics(eventData) {
    const excludeKeysFromStats = [
        "matchNumber"
    ];


    // console.log(eventData)

    const teamKeys = Object.keys(eventData);
    for (let i = 0; i < teamKeys.length; i++) {
        const teamNumber = teamKeys[i];
        const numMatches = eventData[teamNumber].num_matches;
        const matchData = eventData[teamNumber].match_data;

        // Set defaults in case averages cannot be computed.
        Object.keys(matchData).forEach(key => {
            if (!excludeKeysFromStats.includes(key)) {
                const avgKeyName = "mean_" + key;
                const stddevKeyName = "stddev_" + key;
                const minKeyName = "min_" + key;
                const maxKeyName = "max_" + key;

                let meanValue = 0;
                let stddev = 0;
                let minValue = 0;
                let maxValue = 0;

                const samples = matchData[key];

                if (numMatches > 0) {
                    meanValue = mean(samples);
                    stddev = standardDeviation(samples);
                    minValue = min(samples);
                    maxValue = max(samples);
                }

                eventData[teamNumber][avgKeyName] = meanValue;
                eventData[teamNumber][stddevKeyName] = stddev;
                eventData[teamNumber][minKeyName] = minValue;
                eventData[teamNumber][maxKeyName] = maxValue;
            }
        });
    }

    return eventData;
}
