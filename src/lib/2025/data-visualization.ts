// TODO: fix types
// @ts-nocheck

export function getTeamOverview(teamInfo) {
    return [
        {
            name: "Average Points",
            value: teamInfo.mean_matchPoints.toFixed(2)
        },
        {
            name: "Average Auto Points",
            value: teamInfo.mean_autoPoints.toFixed(2)
        },
        {
            name: "Average Teleop Points",
            value: teamInfo.mean_teleopPoints.toFixed(2)
        },
        {
            name: "Average Barge Points",
            value: teamInfo.mean_bargePoints.toFixed(2)
        }
    ];
}

export function teamLikertRadar(teamInfo) {
    return { "Climb Speed": teamInfo.mean_climbSpeed, "Driving": teamInfo.mean_drivingScore, "Defense": teamInfo.mean_defenseScore, "Stability": teamInfo.mean_stabilityScore };
}