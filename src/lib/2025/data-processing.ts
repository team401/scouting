// TODO: fix types
// @ts-nocheck

import { supabase } from '@/lib/supabase-client';
import { mean, standardDeviation, min, max } from 'simple-statistics';
import { sortKeyValueArrays } from '../util';

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

export const eventStatisticsKeys = [
    "rankings", "distributions"
];

export function computeAccuracy(made: Number, missed: Number) {
    let accuracy = 0;
    if (made > 0) {
        accuracy = made / (made + missed);
    }
    return accuracy;
}

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

    // Compute event-wide statistics such as rankings and overall distributions.
    eventData = computeEventStatistics(eventData);

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
                    coralAutoL4Missed: [],
                    coralAutoL3Missed: [],
                    coralAutoL2Missed: [],
                    coralAutoL1Missed: [],
                    coralTeleopL4Missed: [],
                    coralTeleopL3Missed: [],
                    coralTeleopL2Missed: [],
                    coralTeleopL1Missed: [],
                    algaeTeleopPoints: [],
                    teleopPoints: [],
                    bargePoints: [],
                    matchPoints: [],
                    coralPoints: [],
                    algaePoints: [],
                    climbSpeed: [],
                    drivingScore: [],
                    defenseScore: [],
                    stabilityScore: [],
                    comments: [],
                    scoutName: []
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

        const coralAutoL4Missed = Number(rawData[i]["auto.coral.l4.missed"]);
        const coralAutoL3Missed = Number(rawData[i]["auto.coral.l3.missed"]);
        const coralAutoL2Missed = Number(rawData[i]["auto.coral.l2.missed"]);
        const coralAutoL1Missed = Number(rawData[i]["auto.coral.l1.missed"]);
        const coralTeleopL4Missed = Number(rawData[i]["teleop.coral.l4.missed"]);
        const coralTeleopL3Missed = Number(rawData[i]["teleop.coral.l3.missed"]);
        const coralTeleopL2Missed = Number(rawData[i]["teleop.coral.l2.missed"]);
        const coralTeleopL1Missed = Number(rawData[i]["teleop.coral.l1.missed"]);

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

        // Scout comments.
        const scoutComment = String(rawData[i]["postmatch.comments"]);
        const scoutName = String(rawData[i]["prematch.scout_name"])

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
            coralAutoL4Missed: coralAutoL4Missed,
            coralAutoL3Missed: coralAutoL3Missed,
            coralAutoL2Missed: coralAutoL2Missed,
            coralAutoL1Missed: coralAutoL1Missed,
            coralTeleopL4Missed: coralTeleopL4Missed,
            coralTeleopL3Missed: coralTeleopL3Missed,
            coralTeleopL2Missed: coralTeleopL2Missed,
            coralTeleopL1Missed: coralTeleopL1Missed,
            algaeTeleopPoints: algaeTeleopPoints,
            teleopPoints: teleopPoints,
            bargePoints: bargePoints,
            matchPoints: matchPoints,
            coralPoints: coralPoints,
            algaePoints: algaePoints,
            climbSpeed: climbSpeed,
            drivingScore: drivingScore,
            defenseScore: defenseScore,
            stabilityScore: stabilityScore,
            comments: scoutComment,
            scoutName: scoutName
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
        "matchNumber",
        "comments",
        "scoutName"
    ];

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

function computeEventStatistics(eventData) {
    const excludeKeysFromStats = [
        "matchNumber",
        "match_data",
        "team_number",
    ];

    const teamNumbers = Object.keys(eventData);

    // Create rankings and statistical distributions for each metric if there are more than 0 teams.
    if (teamNumbers.length > 0) {
        let matchKeys = Object.keys(eventData[teamNumbers[0]]);
        let rankings = {}
        let eventDists = {}

        matchKeys.forEach((element) => {
            if (!excludeKeysFromStats.includes(element)) {
                let labels = teamNumbers.slice();
                let values = [];

                for (var i = 0; i < teamNumbers.length; i++) {
                    const val = eventData[teamNumbers[i]][element];
                    values.push(val);
                }

                // Sort to find the team order.
                const sorted = sortKeyValueArrays(labels, values);
                labels = [];
                values = [];
                for (const [key, val] of sorted) {
                    labels.push(key);
                    values.push(val);
                }

                // Set the rankings
                rankings[element] = labels.slice();

                // Compute distributions
                eventDists[element] = {};
                eventDists[element]["mean"] = mean(values);
                eventDists[element]["std"] = standardDeviation(values);
                eventDists[element]["min"] = min(values);
                eventDists[element]["max"] = max(values);
            }
        });

        eventData.rankings = rankings;
        eventData.distributions = eventDists;
    }

    return eventData;
}
