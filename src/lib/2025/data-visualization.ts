// TODO: fix types
// @ts-nocheck

import { sum, mean } from 'simple-statistics';
import { getNumberWithOrdinal } from "@/lib/util";

export function getAllianceOverview(teamInfos, teamNumbers, eventStats) {
    if (!eventStats.rankings || !teamInfos) {
        return {};
    }

    const highlightColumns = {
        mean_matchPoints: "Avg. Points",
        mean_autoPoints: "Avg. Auto Points",
        mean_teleopPoints: "Avg. Teleop Points",
        mean_bargePoints: "Avg. Barge Points",
        mean_foulPoints: "Avg. Foul Points"
    };

    const colKeys = Object.keys(highlightColumns);

    let augmentedTeamNumbers = teamNumbers.slice();
    augmentedTeamNumbers.push("Total");
    let allianceHighlight = {}

    for (var i = 0; i < colKeys.length; i++) {
        const col = colKeys[i];
        const numTeams = eventStats.rankings[col].length;

        const prettyColName = highlightColumns[col];
        let colData = {
            rank: [],
            value: [],
            normalized: []
        };

        for (var j = 0; j < teamNumbers.length; j++) {
            const teamNumber = teamNumbers[j];
            const teamInfo = teamInfos[j];

            if (!teamInfo) {
                colData.rank.push(-1);
                colData.normalized.push(-1);
                colData.value.push(0);
                continue;
            }

            const teamRank = eventStats.rankings[col].indexOf(teamNumber) + 1;
            const normalizedRank = teamRank / numTeams;
            const teamValue = Number(teamInfo[col]);

            colData.rank.push(teamRank);
            colData.normalized.push(normalizedRank);
            colData.value.push(teamValue);
        }

        const colTotal = sum(colData.value);
        colData.value.push(colTotal);
        colData.normalized.push(-1);
        colData.rank.push(-1);

        allianceHighlight[prettyColName] = colData;

    }

    return allianceHighlight;
}

export function getTeamOverview(teamInfo, teamNumber, eventStats) {
    if (!eventStats.rankings || !teamInfo) {
        return {};
    }

    const meanPointsRanking = eventStats.rankings.mean_matchPoints.indexOf(teamNumber) + 1;
    const meanAutoPointsRanking = eventStats.rankings.mean_autoPoints.indexOf(teamNumber) + 1;
    const meanTeleopPointsRanking = eventStats.rankings.mean_teleopPoints.indexOf(teamNumber) + 1;
    const meanBargePointsRanking = eventStats.rankings.mean_bargePoints.indexOf(teamNumber) + 1;
    const meanFoulPointsRanking = eventStats.rankings.mean_foulPoints.indexOf(teamNumber) + 1;

    // Get the number of teams to produce a normalized ranking.
    const numTeams = eventStats.rankings.mean_matchPoints.length;

    return [
        {
            name: "Average Points",
            value: teamInfo.mean_matchPoints.toFixed(2),
            ranking: meanPointsRanking,
            normalized: meanPointsRanking / numTeams
        },
        {
            name: "Average Auto Points",
            value: teamInfo.mean_autoPoints.toFixed(2),
            ranking: meanAutoPointsRanking,
            normalized: meanAutoPointsRanking / numTeams
        },
        {
            name: "Average Teleop Points",
            value: teamInfo.mean_teleopPoints.toFixed(2),
            ranking: meanTeleopPointsRanking,
            normalized: meanTeleopPointsRanking / numTeams
        },
        {
            name: "Average Barge Points",
            value: teamInfo.mean_bargePoints.toFixed(2),
            ranking: meanBargePointsRanking,
            normalized: meanBargePointsRanking / numTeams
        },
        {
            name: "Average Foul Points",
            value: Math.abs(teamInfo.mean_foulPoints.toFixed(2)),
            ranking: meanFoulPointsRanking,
            // Fouls are bad, but points are more negative if a team has more fouls. So no adjustment is needed here.
            normalized: meanFoulPointsRanking / numTeams
        }
    ];
}

export function teamLikertRadar(teamInfo, eventStats) {
    if (!teamInfo) {
        return {};
    }

    // Get normalized team points.
    const meanTeamPoints = teamInfo.mean_matchPoints;
    const maxPoints = eventStats.distributions.mean_matchPoints.max;
    const minPoints = eventStats.distributions.mean_matchPoints.min;
    const teamNormalizedPoints = 5.0 * (meanTeamPoints - minPoints) / (maxPoints - minPoints);

    let radarData = {
        "Climb Speed": teamInfo.mean_climbSpeed,
        "Driving": teamInfo.mean_drivingScore,
        "Defense": teamInfo.mean_defenseScore,
        "Stability": teamInfo.mean_stabilityScore,
        "Scoring": teamNormalizedPoints
    };

    return radarData;
}

export function teamReefData(teamInfo) {
    if (!teamInfo) {
        return {};
    }

    const coralAutoL4Count = sum(teamInfo.match_data.coralAutoL4Count);
    // const coralAutoL4Missed = sum(teamInfo.match_data.coralAutoL4Missed);
    const coralTeleopL4Count = sum(teamInfo.match_data.coralTeleopL4Count);
    // const coralTeleopL4Missed = sum(teamInfo.match_data.coralTeleopL4Missed);
    const coralAutoL4MeanCount = mean(teamInfo.match_data.coralAutoL4Count);
    const coralTeleopL4MeanCount = mean(teamInfo.match_data.coralTeleopL4Count);
    const coralL4Count = coralAutoL4Count + coralTeleopL4Count;
    // const coralL4Missed = coralAutoL4Missed + coralTeleopL4Missed;
    // const coralAutoL4Accuracy = computeAccuracy(coralAutoL4Count, coralAutoL4Missed) * 100.0;
    // const coralTeleopL4Accuracy = computeAccuracy(coralTeleopL4Count, coralTeleopL4Missed) * 100.0;
    // const coralL4Accuracy = computeAccuracy(coralL4Count, coralL4Missed) * 100.0;

    const coralAutoL3Count = sum(teamInfo.match_data.coralAutoL3Count);
    // const coralAutoL3Missed = sum(teamInfo.match_data.coralAutoL3Missed);
    const coralTeleopL3Count = sum(teamInfo.match_data.coralTeleopL3Count);
    // const coralTeleopL3Missed = sum(teamInfo.match_data.coralTeleopL3Missed);
    const coralAutoL3MeanCount = mean(teamInfo.match_data.coralAutoL3Count);
    const coralTeleopL3MeanCount = mean(teamInfo.match_data.coralTeleopL3Count);
    const coralL3Count = coralAutoL3Count + coralTeleopL3Count;
    // const coralL3Missed = coralAutoL3Missed + coralTeleopL3Missed;
    // const coralAutoL3Accuracy = computeAccuracy(coralAutoL3Count, coralAutoL3Missed) * 100.0;
    // const coralTeleopL3Accuracy = computeAccuracy(coralTeleopL3Count, coralTeleopL3Missed) * 100.0;
    // const coralL3Accuracy = computeAccuracy(coralL3Count, coralL3Missed) * 100.0;

    const coralAutoL2Count = sum(teamInfo.match_data.coralAutoL2Count);
    // const coralAutoL2Missed = sum(teamInfo.match_data.coralAutoL2Missed);
    const coralTeleopL2Count = sum(teamInfo.match_data.coralTeleopL2Count);
    // const coralTeleopL2Missed = sum(teamInfo.match_data.coralTeleopL2Missed);
    const coralAutoL2MeanCount = mean(teamInfo.match_data.coralAutoL2Count);
    const coralTeleopL2MeanCount = mean(teamInfo.match_data.coralTeleopL2Count);
    const coralL2Count = coralAutoL2Count + coralTeleopL2Count;
    // const coralL2Missed = coralAutoL2Missed + coralTeleopL2Missed;
    // const coralAutoL2Accuracy = computeAccuracy(coralAutoL2Count, coralAutoL2Missed) * 100.0;
    // const coralTeleopL2Accuracy = computeAccuracy(coralTeleopL2Count, coralTeleopL2Missed) * 100.0;
    // const coralL2Accuracy = computeAccuracy(coralL2Count, coralL2Missed) * 100.0;

    const coralAutoL1Count = sum(teamInfo.match_data.coralAutoL1Count);
    // const coralAutoL1Missed = sum(teamInfo.match_data.coralAutoL1Missed);
    const coralTeleopL1Count = sum(teamInfo.match_data.coralTeleopL1Count);
    // const coralTeleopL1Missed = sum(teamInfo.match_data.coralTeleopL1Missed);
    const coralAutoL1MeanCount = mean(teamInfo.match_data.coralAutoL1Count);
    const coralTeleopL1MeanCount = mean(teamInfo.match_data.coralTeleopL1Count);
    const coralL1Count = coralAutoL1Count + coralTeleopL1Count;
    // const coralL1Missed = coralAutoL1Missed + coralTeleopL1Missed;
    // const coralAutoL1Accuracy = computeAccuracy(coralAutoL1Count, coralAutoL1Missed) * 100.0;
    // const coralTeleopL1Accuracy = computeAccuracy(coralTeleopL1Count, coralTeleopL1Missed) * 100.0;
    // const coralL1Accuracy = computeAccuracy(coralL1Count, coralL1Missed) * 100.0;

    return {
        "L4": {
            "auto": coralAutoL4Count,
            "teleop": coralTeleopL4Count,
            "total": coralL4Count,
            // "auto_accuracy": coralAutoL4Accuracy,
            // "teleop_accuracy": coralTeleopL4Accuracy,
            // "total_accuracy": coralL4Accuracy,
            "auto_mean_count": coralAutoL4MeanCount,
            "teleop_mean_count": coralTeleopL4MeanCount,
            "auto_count": teamInfo.match_data.coralAutoL4Count,
            "teleop_count": teamInfo.match_data.coralTeleopL4Count
        },
        "L3": {
            "auto": coralAutoL3Count,
            "teleop": coralTeleopL3Count,
            "total": coralL3Count,
            // "auto_accuracy": coralAutoL3Accuracy,
            // "teleop_accuracy": coralTeleopL3Accuracy,
            // "total_accuracy": coralL3Accuracy,
            "auto_mean_count": coralAutoL3MeanCount,
            "teleop_mean_count": coralTeleopL3MeanCount,
            "auto_count": teamInfo.match_data.coralAutoL3Count,
            "teleop_count": teamInfo.match_data.coralTeleopL3Count
        },
        "L2": {
            "auto": coralAutoL2Count,
            "teleop": coralTeleopL2Count,
            "total": coralL2Count,
            // "auto_accuracy": coralAutoL2Accuracy,
            // "teleop_accuracy": coralTeleopL2Accuracy,
            // "total_accuracy": coralL2Accuracy,
            "auto_mean_count": coralAutoL2MeanCount,
            "teleop_mean_count": coralTeleopL2MeanCount,
            "auto_count": teamInfo.match_data.coralAutoL2Count,
            "teleop_count": teamInfo.match_data.coralTeleopL2Count
        },
        "L1": {
            "auto": coralAutoL1Count,
            "teleop": coralTeleopL1Count,
            "total": coralL1Count,
            // "auto_accuracy": coralAutoL1Accuracy,
            // "teleop_accuracy": coralTeleopL1Accuracy,
            // "total_accuracy": coralL1Accuracy,
            "auto_mean_count": coralAutoL1MeanCount,
            "teleop_mean_count": coralTeleopL1MeanCount,
            "auto_count": teamInfo.match_data.coralAutoL1Count,
            "teleop_count": teamInfo.match_data.coralTeleopL1Count
        }
    }
}

export function getRanking(ranking) {
    return getNumberWithOrdinal(ranking);
}

export function getRankedStyle(normalizedRank) {
    const greenLimit = 0.33;
    const redLimit = 0.6;
    const baseColor = 100;
    const maxColor = 255;
    const multiplier = maxColor - baseColor;

    let style = {};

    // Teams in the top part get a increasingly dark green number as they get closer to the top.
    if (normalizedRank < greenLimit) {
        let greenColor = multiplier * ((greenLimit - normalizedRank) / greenLimit) + baseColor;
        style.color = "rgb(0, " + greenColor + ", 0)";
        style["font-weight"] = "bold";

    } else if (normalizedRank > redLimit) {
        // Teams in the bottom part get an increasingly dark red number as they get closer to the bottom.
        let redColor = multiplier * (normalizedRank - redLimit) / (1.0 - redLimit) + baseColor;
        style.color = "rgb(" + redColor + ", 0, 0)";
        style["font-weight"] = "bold";
    }

    return style;
}