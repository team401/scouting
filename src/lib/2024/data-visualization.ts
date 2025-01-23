// TODO: fix types
// @ts-nocheck

export function teamRadar(teamInfo) {
    return { "Auto Amp": teamInfo.avg_auto_amp, "Teleop Speaker": teamInfo.avg_teleop_speaker, "Teleop Amp": teamInfo.avg_teleop_amp };
}