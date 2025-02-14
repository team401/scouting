// TODO: fix types
// @ts-nocheck

export function getTeamOverview(teamInfo) {
    console.log(teamInfo)
    return [
        {
            name: "Average Points",
            value: teamInfo.avg_points.toFixed(2)
        },
        {
            name: "Average Auto Points",
            value: teamInfo.avg_auto_points.toFixed(2)
        },
        {
            name: "Average Teleop Points",
            value: teamInfo.avg_teleop_points.toFixed(2)
        },
        {
            name: "Average Barge Points",
            value: teamInfo.avg_barge_points.toFixed(2)
        }
    ];
}

export function teamLikertRadar(teamInfo) {
    return { "Climb Speed": teamInfo.avg_climb_speed, "Driving": teamInfo.avg_driving, "Defense": teamInfo.avg_defense, "Stability": teamInfo.avg_stability };
}